import { LightningElement, track, api, wire } from 'lwc';
import { apiService } from 'c/service';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import NAME_FIELD from '@salesforce/schema/User.Name';
import EMAIL_FIELD from '@salesforce/schema/User.Email';

export default class MyAssignments extends LightningElement {
    cardTitle = "My Assignments";
    cardIcon = "utility:assignment";
    cardMode = "worklist";

    @track
    state = {
        mode: this.cardMode,
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
            this.template.querySelector('c-assignment-list').setOperator(this.state.operator);
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

    handleWorkItemSelected(event) {
        this.state.mode = "workobject";
        this.state.assignmentId = event.detail.assignmentId;
        this.state.caseId = event.detail.caseId;
        this.state = {...this.state};
    }

    handleWorkObjectClosed() {
        this.state.mode = this.cardMode;
        this.state.title = this.cardTitle;
        this.state.icon = this.cardIcon;
        this.state = {...this.state};
    }

    handleChangeTitle(event) {
        this.state.title = `${event.detail.caseName} - ${event.detail.caseId} - ${event.detail.action}`;
        this.state.icon = "utility:case";
        this.state = {...this.state};
    }

    get isWorklist() {
        return this.state.mode === this.cardMode;
    }
}