import { LightningElement, track, api, wire } from "lwc";
import { apiService } from "c/service";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from "@salesforce/user/Id";
import NAME_FIELD from "@salesforce/schema/User.Name";
import EMAIL_FIELD from "@salesforce/schema/User.Email";
import { fireEvent } from "c/pegapubsub";
import { CurrentPageReference } from "lightning/navigation";

const opptyFields = [
  "Opportunity.Name",
  "Opportunity.AccountId",
  "Opportunity.OwnerId",
  "Opportunity.Type",
  "Opportunity.Amount",
  "Opportunity.CaseId__c"
];

export default class NextBestAction extends LightningElement {
  @track selectedIdx = 0;
  @api url;
  @api user;
  @api password;
  @api authentication;
  @api nbaDataPage;
  @api hardcodedCustomerId;
  @api offerFlowMode;
  @api caseTypeId;
  @api processId;
  @api caseTypeIdRejected;
  @api processIdRejected;
  @api caseDisplayMode;
  @api mashupUrl;

  @wire(CurrentPageReference) pageRef;

  customerId;
  cardTitle = "Real-time offers";
  cardIcon = "utility:choice";
  cardOffersMode = "offers";
  cardCreateWorkMode = "createWork";
  content = {};
  selectedOfferId;
  sfdcCustomerName;

  // get record data for the oppty or service case (based on context in SFDC)
  @api recordId;
  @wire(getRecord, { recordId: "$recordId", opptyFields })
  sfdcOpportunity;

  @wire(getRecord, {
    recordId: "$recordId",
    layoutTypes: ["Full"],
    modes: ["Edit"]
  })
  sfdcCase;


  @track
  state = {
    operator: null,
    title: this.cardTitle,
    icon: this.cardIcon,
    noOfferMsg: "No offers available",
    mode: this.cardOffersMode,
    assignmentId: "",
    caseId: ""
  };
  @track showSpinner;
  @track nbaData = [];
  email;
  name;

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

  initLocal() {
    //
    // TODO: this is for local debugging, remove it
    //
    apiService.initComponentLocal(this);
    this.url = "https://ltgcrazyhorse.com/prweb/api/v1/";
    this.nbaDataPage = "D_CustomerOffers";
    this.caseTypeId = "O1SPYR-DigExp-Work-OpportunityDemo";
    this.processId = "pyStartCase";
    this.caseDisplayMode = "Lightning";
  }

  async init() {
    // this.initLocal();
    if (this.email && this.authentication) {
      await apiService.initComponent(this);
    }
    this.getNextBestAction();
  }

  connectedCallback() {
    this.init();
  }

  disconnectedCallback() {
    apiService.clear(this.url);
  }

  handleSelect(event) {
    this.selectedIdx = event.detail.index;
  }

  get showOffers() {
    return this.nbaData.length > 0;
  }

  get isOffersMode() {
    return this.state.mode === this.cardOffersMode;
  }

  get isCreateWork() {
    return this.state.mode === this.cardCreateWorkMode;
  }

  get isMashupMode() {
    return this.caseDisplayMode === "Mashup";
  }

  get noOfferMsg() {
    if (this.customerId) return this.state.noOfferMsg;
    return "";
  }

  handleSearch(evt) {
    this.customerId = evt.target.value;
    if (!this.customerId) this.nbaData = [];
  }

  async handleKeyUp(evt) {
    const isEnterKey = evt.keyCode === 13;
    if (isEnterKey) {
      this.customerId = evt.target.value;
      this.getNextBestAction();
    }
  }

  async getNextBestAction() {
    this.sfdcCustomerName = this.sfdcCase.data.fields.Contact.displayValue;    
    let cId;
    if (this.hardcodedCustomerId.length === 0) 
      cId = this.sfdcCustomerName;
    else 
      cId = this.hardcodedCustomerId;
    console.log(`customer: ${cId}`);

    const offers = await apiService.getDataPage(this.url, this.nbaDataPage, {
      customerId : cId,
      hasRejected: false
    });
    if (offers && offers.pxResults) this.nbaData = offers.pxResults;

  }

  handleChoice = choice => {    
    if (this.nbaData.length > 0) {
      console.log(this.sfdcCase);
      console.log(this.sfdcCase.data.fields.Contact.displayValue);
      this.selectedOfferId = this.nbaData[this.selectedIdx].ID;
      console.log(
        `Customer ID: ${this.sfdcCustomerName}, Selected Offer ID: ${this.selectedOfferId}, choice: ${choice}`
      );
      console.log(this.sfdcCase);
      this.nbaData.splice(this.selectedIdx, 1);
      this.selectedIdx = 0;
      this.nbaData = [...this.nbaData];
      this.createCase(
        this.caseTypeId, 
        this.processId,
        choice);
    }
  };

  async createCase(caseTypeId, processId, status) {
    this.showSpinner = true;
    try {
      console.log(
        `case type id ${caseTypeId},
        process id ${processId},
        offer id ${this.selectedOfferId}, 
        offer status ${status},         
        record id ${this.recordId}, 
        customer id ${this.sfdcCustomerName}`
      );
      
      let content = {        
        OfferID: this.selectedOfferId,
        OfferStatus: status,
        RecordId: this.recordId,        
        CustomerID: this.customerId
      };

      let body = {
        caseTypeID: caseTypeId,
        processID: processId,
        content
      };
      

      let newCase = await apiService.createCase(this.url, body);

      // we don't want to open that case
      /*
      if (newCase.nextAssignmentID) {
        this.state = {
          ...this.state,
          assignmentId: newCase.nextAssignmentID,
          caseId: newCase.ID,
          mode: this.cardCreateWorkMode
        };
        fireEvent(this.pageRef, "workObjectCreated", newCase.ID);    
      } else {
        apiService.showMessage("Case created", `Case created`, this, "info");
      }
      */

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
        console.log(err);
      }
    }
    this.showSpinner = false;
  }

  handleWorkObjectClosed() {
    this.state = {
      ...this.state,
      mode: this.cardOffersMode,
      title: this.cardTitle,
      icon: this.cardIcon,
      assignmentId: null,
      caseId: null
    };
  }

  handleChangeTitle(event) {
    this.state.title = `${event.detail.caseName} - ${event.detail.caseId} - ${event.detail.action}`;
    this.state.icon = "utility:case";
  }
}
