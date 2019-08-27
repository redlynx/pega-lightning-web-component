import { LightningElement, track, api, wire } from 'lwc';
import { apiService } from 'c/service';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';

export default class GetNextWork extends LightningElement {
    cardTitle = "My Next Work";
    cardIcon = "utility:case";
    cardMode = "nextWork";

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

    email;
    name;
    showSpinner;    

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
        } catch (err) {
            apiService.showError(err, this);
        }
    }

    connectedCallback() { 
        if (apiService.isInitialized(this.url)) {
            this.init();
        }
    }

    disconnectedCallback() {
        apiService.clear(this.url);
    }

    async handleClick() {
        this.showSpinner = true;
        try {
            let nextAssignment = await apiService.getNextAssignment(this.url);
            if (nextAssignment && nextAssignment.ID) {
                this.state.assignmentId = nextAssignment.ID;
                this.state.caseId = nextAssignment.caseID;
                this.state.mode = "workobject";
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
    }

    handleChangeTitle(event) {
        this.state.title = `${event.detail.caseName} - ${event.detail.caseId} - ${event.detail.action}`;
        this.state.icon = "utility:case";
    }

    get isNextWork() {
        return this.state.mode === this.cardMode;
    }
}