import { LightningElement, track, api, wire } from "lwc";
import { apiService } from "c/service";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from "@salesforce/user/Id";
import NAME_FIELD from "@salesforce/schema/User.Name";
import EMAIL_FIELD from "@salesforce/schema/User.Email";

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
    operator: null,
    caseUrl: null
  };

  @api urls;
  @api user;
  @api password;
  @api authentication;
  @api worklistDataPage = "D_pyMyWorkList";
  @api defaulColumns =
    "pxRefObjectInsName, pyAssignmentStatus, pxUrgencyAssign, pyLabel, pxCreateDateTime, pxTaskLabel";
  @api workBasketDataPage = "D_WorkBasket";

  email;
  name;
  endpoints = [];
  wlColumns;
  wbColumns =
    "pxRefObjectInsName, pyAssignmentStatus, pxUrgencyAssign, pyLabel, pxCreateDateTime";

  @wire(getRecord, {
    recordId: USER_ID,
    fields: [NAME_FIELD, EMAIL_FIELD]
  })
  async wireuser({ error, data }) {
    if (error) {
      apiService.showError(error, this);
    } else if (data) {
      this.email = getFieldValue(data, EMAIL_FIELD);
      this.name = getFieldValue(data, NAME_FIELD);
      // this.cardTitle = this.name + "'s Assignments"
      // this.state.title = this.cardTitle;
      await this.init();
    }
  }

  async init() {
    //
    // TODO: this is for local debugging, remove it
    //
    await apiService.initComponentLocal(this);
    this.template
      .querySelector("c-assignment-list")
      .setOperator(this.state.operator);

    // if (this.email && this.authentication) {
    //     const isInitialized = await apiService.initComponent(this);
    //     if (isInitialized) {
    //         this.template.querySelector('c-assignment-list').setOperator(this.state.operator);
    //     }
    // }
  }

  connectedCallback() {
    debugger;
    this.init();
  }

  disconnectedCallback() {
    this.endpoints.forEach(url => apiService.clear(url));
  }

  handleWorkItemSelected(event) {
    this.state = {
      ...this.state,
      mode: "workobject",
      assignmentId: event.detail.assignmentId,
      caseId: event.detail.caseId,
      caseUrl: event.detail.caseUrl
    };
  }

  handleWorkObjectClosed() {
    this.state = {
      ...this.state,
      mode: this.cardMode,
      title: this.cardTitle,
      icon: this.cardIcon,
      assignmentId: null,
      caseId: null,
      caseUrl: null
    };
  }

  handleChangeTitle(event) {
    this.state.title = `${event.detail.caseName} - ${event.detail.caseId} - ${event.detail.action}`;
    this.state.icon = "utility:case";
    this.state = { ...this.state };
  }

  @api
  get worklistColumns() {
    if (!this.wlColumns) return this.defaulColumns;
    return this.wlColumns;
  }
  set worklistColumns(cols) {
    this.wlColumns = cols;
  }

  @api
  get workBasketColumns() {
    if (!this.wbColumns) return this.defaulColumns;
    return this.wbColumns;
  }
  set workBasketColumns(cols) {
    this.wbColumns = cols;
  }

  get isWorklist() {
    return this.state.mode === this.cardMode;
  }
}
