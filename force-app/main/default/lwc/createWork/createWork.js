import { LightningElement, track, api, wire } from 'lwc';
import { apiService } from 'c/service';
import { getRecord } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';

import USER_ID from '@salesforce/user/Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';

export default class CreateWork extends LightningElement {
    cardTitle = "Create Case";
    cardIcon = "utility:record_create";
    cardMode = "createWork";
    
    @track newHarnessView;

    @track
    state = {
        mode:  this.cardMode,
        assignmentId: null,
        caseId: null,
        title: this.cardTitle,
        icon: this.cardIcon,
        operator: null
    };

    @api url;
    @api user;
    @api password;
    @api authentication;
    @api processId;
    @api caseType;

    email;
    name;
    @track caseTypes = [];
    showSpinner;

    @wire(CurrentPageReference) pageRef;
    @wire(getRecord, {
        recordId: USER_ID,
        fields: [NAME_FIELD, EMAIL_FIELD]
    })
    async wireuser({error, data}) {
        if (error) {
            apiService.showError(error, this);
        } else if (data) {
            this.email = data.fields.Email.value;
            this.name = data.fields.Name.value;
            if (this.authentication === "Basic" && this.user && this.password) this.email = this.user;
            await apiService.init(this.url, this.authentication, this.email, this.password);
            this.init();
        }
    }

    async init() {
        try {
            this.state.operator = await apiService.getDataPage(this.url, "D_OperatorID");
            let types = await apiService.getCaseTypes(this.url);
            if (types && types.caseTypes && types.caseTypes.length > 0){
                this.caseTypes = types.caseTypes.filter(caseType => caseType.CanCreate === "true");
            }
        } catch (err) {
            apiService.showError(err, this);
        }
    }

    async connectedCallback() { 
        if (apiService.isInitialized(this.url)) {
            this.init();
        }
    }

    disconnectedCallback() {
        apiService.clear(this.url);
    }

    handleClick(evt) {
        this.showSpinner = true;
        this.state.assignmentId = null;
        this.state.caseId = null;

        let idx = evt.target.dataset.index;
        let caseType = this.caseTypes[idx];
        if (caseType && caseType.startingProcesses && caseType.startingProcesses.length > 0
            && caseType.startingProcesses[0].requiresFieldsToCreate === "true") {
            this.showNewHarness(caseType); 
        } else {
            this.createCase(caseType);
        }
    }

    async showNewHarness(caseType) { 
        this.showSpinner = true;
        try {
            let newHarness = await apiService.getCaseTypeDetails(this.url, caseType.ID);
            newHarness.creation_page.visible = true;

            this.newHarnessView = newHarness.creation_page;
            this.state.mode = "newharness";
            this.caseType = caseType.ID;
            this.processId = caseType.startingProcesses[0].ID;
            this.showSpinner = false;
        } catch (err) {
            if (err && err.errors && err.errors.length > 0 && err.errors[0].ID === "Pega_API_023") {
                apiService.showMessage("No Assignments", err.errors[0].message, this, "info");                
            } else {
                apiService.showError(err, this);
            }
            this.showSpinner = false;
        }
    }

    async createCase(caseType) {
        this.showSpinner = true;
        try {
            let content = {};
            let body = {
                caseTypeID: caseType.ID,
                processID: caseType.startingProcesses[0].ID,
                content
            };
            let newCase = await apiService.createCase(this.url, body);
            if (newCase.nextAssignmentID) {
                this.state.assignmentId = newCase.nextAssignmentID;
                this.state.caseId = newCase.ID;
                this.state.mode = "workobject";
                fireEvent(this.pageRef, 'workObjectCreated', newCase.ID);
            } else {
                apiService.showMessage("Case created", `Case created`, this, "info");
            }
        } catch (err) {
            if (err && err.errors && err.errors.length > 0 && err.errors[0].ID === "Pega_API_023") {
                apiService.showMessage("No Assignments", err.errors[0].message, this, "info");                
            } else {
                apiService.showError(err, this);
            }
        }
        this.showSpinner = false;
    }

    handleWorkObjectClosed() {
        this.state.mode = this.cardMode;
        this.state.title = this.cardTitle;
        this.state.icon = this.cardIcon;
        this.state.assignmentId = null;
        this.state.caseId = null;
    }

    handleChangeTitle(event) {
        this.state.title = `${event.detail.caseName} - ${event.detail.caseId} - ${event.detail.action}`;
        this.state.icon = "utility:case";
    }

    get isCreateWork() {
        return this.state.mode === this.cardMode;
    }
}