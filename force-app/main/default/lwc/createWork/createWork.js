import { LightningElement, track, api, wire } from "lwc";
import { apiService } from "c/service";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { CurrentPageReference } from "lightning/navigation";
import { fireEvent } from "c/pubsub";

import USER_ID from "@salesforce/user/Id";
import NAME_FIELD from "@salesforce/schema/User.Name";
import EMAIL_FIELD from "@salesforce/schema/User.Email";

export default class CreateWork extends LightningElement {
  cardTitle = "Create Case";
  cardIcon = "utility:record_create";
  cardMode = "createWork";
  numberOfCols = 4;

  @track newHarnessView;
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
  @api flows;
  @api processId;
  @api caseType;
  @track caseTypes = [];

  @track rows = [[]];
  @track lastRow = [];
  @track lastColSize = 1;
  @track align = "center";

  email;
  name;
  endpoints = [];
  showSpinner;
  errorMessages = {};

  @wire(CurrentPageReference) pageRef;
  @wire(getRecord, {
    recordId: USER_ID,
    fields: [NAME_FIELD, EMAIL_FIELD]
  })
  async wireuser({ error, data }) {
    if (error) {
      debugger;
      apiService.showError(error, this);
    } else if (data) {
      this.email = getFieldValue(data, EMAIL_FIELD);
      this.name = getFieldValue(data, NAME_FIELD);
      this.init();
    }
  }

  async init() {
    // await apiService.initComponentLocal(this);
    if (this.email && this.authentication) {
      await apiService.initComponent(this);
      await this.getCaseTypes();
    }
  }

  connectedCallback() {
    this.init();
  }

  async getCaseTypes() {
    debugger;
    let types = [];
    for (let i = 0; i < this.endpoints.length; i++) {
      try {
        let currentTypes = await apiService.getCaseTypes(this.endpoints[i]);
        if (currentTypes && currentTypes.caseTypes) {
          currentTypes.caseTypes.forEach(caseType => {
            if (caseType.CanCreate === true || caseType.CanCreate === "true") {
              caseType.caseUrl = this.endpoints[i];
              types.push(caseType);
            }
          });
        }
      } catch (error) {
        this.errorMessages[this.endpoints[i]] = `${
          this.endpoints[i].split(/\//)[2]
        } is not responsing, please contact your system administrator.`;
      }
    }

    let flows = [];
    if (types.length > 0) {
      if (this.flows) {
        this.flows = this.flows.toUpperCase();
        flows = this.flows.split(/\s*,\s*/);
        types = types.filter(
          caseType =>
          (caseType.CanCreate === true || caseType.CanCreate === "true") &&
            (!this.flows || flows.includes(caseType.name.toUpperCase()))
        );
      }

      const types2D = [];
      types.forEach((type, idx) => {
        if (idx % this.numberOfCols === 0) types2D.push([]);
        types2D[types2D.length - 1].push(type);
      });

      this.caseTypes = types;

      if (types2D.length > 1) {
        this.align = "space";
        this.rows = types2D.slice(0, types2D.length - 1);
      } else {
        this.align = "center";
        this.rows = types2D;
      }
      if (types2D.length > 1 && types2D[types2D.length - 1].length !== 4) {
        let lastRow = types2D.slice(types2D.length - 1)[0];
        let lastColSize = (4 - lastRow.length) * 3;
        this.lastRow = lastRow;
        this.lastColSize = lastColSize;
      }
    }
  }

  get hasErrors() {
    return this.errorMessages && Object.keys(this.errorMessages).length > 0;
  }

  get errors() {
    let errors = [];
    Object.keys(this.errorMessages).forEach(k => {
      errors.push(this.errorMessages[k]);
    });
    return errors;
  }

  hideErrors = event => {
    event.preventDefault();
    this.urls = this.urls
      .split(/\s*,\s*/)
      .filter(itm => this.errorMessages[itm] === null)
      .join(",");
    this.errorMessages = {};
  };

  disconnectedCallback() {
    // apiService.clear(this.url);
  }

  handleClick(evt) {
    this.showSpinner = true;
    this.state.assignmentId = null;
    this.state.caseId = null;
    this.errorMessages = {};
    let idx = evt.target.dataset.index;
    let caseType = this.caseTypes[idx];
    this.state.caseUrl = caseType.caseUrl;
    if (
      caseType &&
      caseType.startingProcesses &&
      caseType.startingProcesses.length > 0 &&
      (caseType.startingProcesses[0].requiresFieldsToCreate === true || caseType.startingProcesses[0].requiresFieldsToCreate === "true")
    ) {
      this.showNewHarness(caseType);
    } else {
      this.createCase(caseType);
    }
  }

  async showNewHarness(caseType) {
    this.showSpinner = true;
    try {
      let newHarness = await apiService.getCaseTypeDetails(
        caseType.caseUrl,
        caseType.ID
      );
      newHarness.creation_page.visible = true;

      this.newHarnessView = newHarness.creation_page;
      this.state.mode = "newharness";
      this.caseType = caseType.ID;
      this.processId = caseType.startingProcesses[0].ID;
      this.showSpinner = false;
    } catch (err) {
      debugger;
      if (
        err &&
        err.errors &&
        err.errors.length > 0 &&
        err.errors[0].ID === "Pega_API_023"
      ) {
        apiService.showMessage(
          "No Assignments",
          err.errors[0].message,
          this,
          "info"
        );
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
      const processID = caseType.startingProcesses && caseType.startingProcesses.length > 0 ? caseType.startingProcesses[0].ID : "pyStartCase";
      let body = {
        caseTypeID: caseType.ID,
        processID,
        content
      };
      let newCase = await apiService.createCase(caseType.caseUrl, body);
      if (newCase.nextAssignmentID) {
        this.state.assignmentId = newCase.nextAssignmentID;
        this.state.caseId = newCase.ID;
        this.state.mode = "workobject";
        fireEvent(this.pageRef, "workObjectCreated", newCase.ID);
      } else {
        apiService.showMessage("Case created", `Case created`, this, "info");
      }
    } catch (err) {
      debugger;
      if (
        err &&
        err.errors &&
        err.errors.length > 0 &&
        err.errors[0].ID === "Pega_API_023"
      ) {
        apiService.showMessage(
          "No Assignments",
          err.errors[0].message,
          this,
          "info"
        );
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

  get keyRow() {
    return apiService.generateKey("tr");
  }

  get key() {
    return apiService.generateKey("k");
  }
}
