import { LightningElement, track, api, wire } from 'lwc';
import { apiService } from 'c/service';
import { getRecord, generateRecordInputForUpdate, updateRecord } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';

import { subscribe, unsubscribe, onError } from 'lightning/empApi';

import USER_ID from '@salesforce/user/Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';

const fields = [
    'Opportunity.Name',
    'Opportunity.AccountId',
    'Opportunity.OwnerId',
    'Opportunity.Type',
    'Opportunity.Amount',    
    'Opportunity.CaseId__c'
];

window.update = async (amount) => {
    debugger
    let  recordInput = await generateRecordInputForUpdate({
            "apiName": "Opportunity",
            "childRelationships": {},
            "fields": {
                "Amount": {
                    "value": amount
                },
            },
            "id": window.opportunityId,
    });
    console.log(JSON.stringify(recordInput));
    updateRecord(recordInput);    
}

export default class CreateWork extends LightningElement {
    cardTitle = "Create Opportunity";
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

    @api recordId;
    @wire(getRecord, { recordId: '$recordId', fields })
    opportunity;

    subscription = {};
    @track msg;

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
                this.caseTypes = types.caseTypes.filter(caseType => caseType.CanCreate === "true" && caseType.name.startsWith("Opportunity"));
            }
        } catch (err) {
            apiService.showError(err, this);
        }
    }

    async connectedCallback() { 
        if (apiService.isInitialized(this.url)) {
            this.init();
        }

        // if (this.subscription) return;

        onError(error => {
            console.log(error);
        });

        const messageCallback = msg => {
            if (msg.data.payload.Name) this.msg = 'Opportunity name changed to ' + msg.data.payload.Name;
            // if (msg.data.payload.CaseId__c) this.msg = 'Pega Case ID has changed to ' + msg.data.payload.CaseId__c;

            console.log('New message received : ', JSON.stringify(msg));
        };

        subscribe('/data/OpportunityChangeEvent', -1, messageCallback).then(response => {
            this.subscription = response;
        });

    }

    disconnectedCallback() {
        apiService.clear(this.url);
        if (this.subscription) {
            unsubscribe(this.subscription, () => {
                this.subscription = null;
            });
        }
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
        try {
            let newHarness = await apiService.getCaseTypeDetails(this.url, caseType.ID);
            newHarness.creation_page.visible = true;
            this.newHarnessView = newHarness.creation_page;
            this.state.mode = "newharness";
            this.caseType = caseType.ID;
            this.processId = caseType.startingProcesses[0].ID;
        } catch (err) {
            if (err && err.errors && err.errors.length > 0 && err.errors[0].ID === "Pega_API_023") {
                apiService.showMessage("No Assignments", err.errors[0].message, this, "info");                
            } else {
                apiService.showError(err, this);
            }
        }
        this.showSpinner = false;
    }

    async createCase(caseType) {
        try {
            let content = {};
            if (this.recordId) {
                content = {
                    ID: this.recordId,
                    Name: this.opportunity.data.fields.Name.value,
                    Amount: this.opportunity.data.fields.Amount.value
                }
            }
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

            if (this.opportunity) {
                window.opportunity = this.opportunity.data;
                window.opportunityId = this.recordId;
                let  recordInput = await generateRecordInputForUpdate(this.opportunity.data);
                recordInput.fields.CaseId__c = this.state.caseId;
                console.log(JSON.stringify(recordInput));
                updateRecord(recordInput);
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