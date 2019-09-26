import { LightningElement, api, track, wire } from 'lwc';
import { apiService } from 'c/service';
import perform from './perform.html'
import confirm from './confirm.html'
import newHarness from './new.html'
import Field from 'c/field';
import ReferenceHelper from 'c/referenceHelper'
import { CurrentPageReference } from 'lightning/navigation';
import { fireEvent } from 'c/pubsub';

export default class WorkObject extends LightningElement {
    @api assignmentId;
    @api caseId;
    @api newHarnessView
    @api processId;
    @api caseType;
    @api hideButtonsArea;
    @api url;

    @track workObject;
    @track stages = [];
    @track currentStage = "";
    @track actions = [{label: "Refresh", value: "Refresh"}];
    @track view;
    @track validationErrors = [];
    @track confirmHarnessMode;
    @track showSpinner;
    
    @wire(CurrentPageReference) pageRef;

    componentRegistry = {};
    assignment;
    caseDetails;
    currentAction;
    flowAction;
    caseData = {};


    static get actionNames() {
        return {
            SET_VALUE: "setValue",
            POST_VALUE: "postValue",
            REFRESH: "refresh",
            PERFORM_ACTION: "takeAction",
            RUN_SCRIPT: "runScript",
            OPEN_URL: "openUrlInWindow"
        };
    }
    static get supportedActions() {
        return [
            WorkObject.actionNames.POST_VALUE,
            WorkObject.actionNames.SET_VALUE,
            WorkObject.actionNames.REFRESH,
            WorkObject.actionNames.PERFORM_ACTION,
            WorkObject.actionNames.RUN_SCRIPT,
            WorkObject.actionNames.OPEN_URL         
        ];
    }

    static get gridTypes() {
        return {
            GROUP: "Group",
            LIST: "List"
        };
    }
   
    connectedCallback() {
        if (this.assignmentId && this.caseId){
            this.getAssignment();
            this.confirmHarnessMode = false;
        }
    }

    render() {
        if (this.confirmHarnessMode) return confirm;
        if (this.newHarnessView) return newHarness;
        return perform;
    }
    
    async getAssignment(actionName) {
        try {
            this.showSpinner = true; 
            this.currentAction = null;
            this.caseData = {};
            let assignment = await apiService.getAssignment(this.url, this.assignmentId);
            this.assignment = assignment;
            if (this.assignment.actions && this.assignment.actions.length > 0) {
                this.currentAction = actionName ? actionName : this.assignment.actions[0].ID;
                this.flowAction = this.assignment.actions[0].ID;
                this.fireChangeTitleEvent();
                this.workObject = await apiService.getCase(this.url, this.caseId);
                this.currentStage = this.workObject.stage;
                this.setStages();
                this.setActions();
                let view = await apiService.getFieldsForAssignment(this.url, this.assignmentId, this.currentAction);
                this.view = view;
                debugger
                let caseData = ReferenceHelper.getInitialValuesFromView(this.view.view);
                this.caseData = caseData;
                this.template.querySelector('c-view').setView(this.view.view);
                this.showSpinner = false;          
                this.caseDetails = await apiService.getView(this.url, this.caseId, "pyCaseDetails");
                let modal = this.template.querySelector('c-modal-dialog');
                modal.setView(this.caseDetails);
            }
            return assignment;
        } catch (error) {
            this.template.querySelector('c-view').setView({});
            this.showSpinner = false;           
            apiService.showError(error, this);
            return Promise.reject();            
        }
    }

    registerComponent = (reference, field, component, setValue) => {
        if (!reference || !field) return;
        const newField = { field, setValue };
        if (component) newField.component = component;
        if (!this.componentRegistry[reference]) {
            this.componentRegistry[reference] = [newField];
        } else {
            this.componentRegistry[reference].push(newField);
        }
    }

    resetAssignment() {
        this.template.querySelector('c-view').setView(null);
        this.currentAction = null; 
    }

    setNewHarnessView(newHarnessView) {
        this.newHarnessView = newHarnessView;
    }

    setActions = () => {
        let actions = this.assignment.actions.map(itm => {
            return {
                label: itm.name,
                value: itm.ID
            }
        });
        actions.shift();
        actions.unshift({label: "Refresh", value: "Refresh"});
        
        this.actions = actions;
        this.actions.push({label: this.flowAction, value: this.flowAction});
    }

    setStages = () => {
        let stages = this.workObject.stages.map(itm => {
            return {
                label: itm.name,
                value: itm.ID
            }
        });
        this.stages = stages;
    }

    showToast = () => {
        apiService.showError(null, this);
    }

    fireChangeTitleEvent = () => {
        const changeTitle = new CustomEvent('changetitle', {
            detail: { 
                caseName: this.assignment.name,
                caseId: this.caseId.split(" ")[1],
                action: this.currentAction
            }
        });
        this.dispatchEvent(changeTitle);
    }

    handleGridAction(evt) {
        this.showSpinner = true;
        if (evt.detail.referenceType === WorkObject.gridTypes.LIST) {
            this.handlePageListAction(evt.detail.reference, evt.detail.action);
        } else {
            this.handlePageGroupAction(evt.detail.reference, evt.detail.action);
		}
		this.showSpinner = false;
    }

    async handlePageListAction(reference, action) {
        let postContent = ReferenceHelper.getPostContent(this.caseData);
        let target = ReferenceHelper.getRepeatFromReference(
            reference,
            WorkObject.gridTypes.LIST,
            postContent
        );
        
        if (action === "add") {
            target.push(ReferenceHelper.getBlankRowForRepeat(target));
        } else if (target.length > 1) {
            target.pop();
        }
        let content = { content:  postContent };
        this.refreshAssignment(content);
    }

    handlePageGroupAction(reference, action) {
        let isRemove = action === "delete";
        let postContent = ReferenceHelper.getPostContent(this.caseData);
        let target = ReferenceHelper.getRepeatFromReference(
            reference,
            WorkObject.gridTypes.GROUP,
            postContent
        );
    
        const name = isRemove
            ? prompt("Enter the name of the group to be deleted.")
            : prompt("Enter a name for the group.");
        if (!name) return;
        if (isRemove) {
            delete target[name];
        } else {
            target[name] = {};
        }
        let content = { content:  postContent };
        this.refreshAssignment(content)  
    }

    async refreshAssignment(content) {
        try {
            this.componentRegistry = {};
            let view = await apiService.performRefreshOnAssignment(this.url, this.assignmentId, this.currentAction, content);
            this.view = view;
            let caseData = ReferenceHelper.getInitialValuesFromView(this.view.view);
            this.caseData = caseData;
            this.template.querySelector('c-view').setView(this.view.view);
            this.showSpinner = false;
            return view;
        } catch (error) {
            this.showSpinner = false;           
            apiService.showError(error, this);
            return Promise.reject(error);
        }
    }

    getActionData(field, targetActions) {
        let result = [];
        if (field.control && field.control.actionSets) {
          let actionSets = field.control.actionSets;
    
          for (let i = 0; i < actionSets.length; i++) {
            // If we see one of the target actions, return that action
            let actions = actionSets[i].actions;
            let events = actionSets[i].events;
    
            for (let j = 0; j < actions.length; j++) {
                if (targetActions.some(targetAction => targetAction === actions[j].action)) {
                    result.push({ ...actions[j], events: events });
                }
            }
          }
        }
    
        return result;
    }  

    generateEventHandler(field) {
        let actionData = this.getActionData(field, WorkObject.supportedActions);
        let hasFieldRefresh = false;
        let actionsList = [];
    
        for (let i = 0; i < actionData.length; i++) {
          switch (actionData[i].action) {
            case WorkObject.actionNames.SET_VALUE:
                actionsList.push({
                    handler: this.handleSetValue,
                    data: actionData[i].actionProcess
                });
                break;
            case WorkObject.actionNames.POST_VALUE:
                if (!hasFieldRefresh) {
                    actionsList.push({ 
                        handler: this.handleFieldRefresh, 
                        data: actionData[i].actionProcess
                    });
                    hasFieldRefresh = true;
                }
                break;
            case WorkObject.actionNames.REFRESH:
                if (!hasFieldRefresh) {
                    actionsList.push({
                        handler: this.handleFieldRefresh,
                        data: actionData[i].actionProcess,
                        refreshFor: actionData[i].refreshFor
                    });
                    hasFieldRefresh = true;
                }
                break;
            case WorkObject.actionNames.PERFORM_ACTION:
                actionsList.push({
                    handler: this.handlePerform,
                    data: actionData[i].actionProcess
                });
              break;
            case WorkObject.actionNames.RUN_SCRIPT:
                actionsList.push({
                    handler: this.handleRunScript,
                    data: actionData[i].actionProcess
                });
              break;
            case WorkObject.actionNames.OPEN_URL:
                actionsList.push({
                    handler: this.handleOpenUrl,
                    data: actionData[i].actionProcess
                });
              break;
            default:
              break;
          }
        }
        return this.createEventHandler(actionsList);
    }

    createEventHandler = (actionHandlers) => {
		if (!actionHandlers || actionHandlers.length === 0) return null;
        let eventHandler = (evt) => {
            actionHandlers.reduce((promise, actionHandler) => {
                    return promise.then(() => actionHandler.handler.call(this, evt, actionHandler)
                );
            }, Promise.resolve());
        };
        return eventHandler;
    }    

    expandRelativePath = (relPath) => {
        if (relPath.charAt(0) === ".") {
          return relPath.substring(1);
        }
    
        return relPath;
    }

    handleFieldRefresh = (evt, actionData) => {
		let postContent = ReferenceHelper.getPostContent(this.caseData);
        let content = { content: postContent };
        if (actionData && actionData.refreshFor) {
          ReferenceHelper.addEntry(
            "refreshFor",
            actionData.refreshFor,
            content
          );
        }
        return this.refreshAssignment(content);
    }

    handleSetValue = (evt, actionData) => {
        if (actionData.data && actionData.data.setValuePairs) {
            actionData.data.setValuePairs.forEach(pair => {
                // The paths attached to setvaluepairs include relative references.
                // Must make them absolute to be handled by ReferenceHelper.addEntry()
                let val;
                let fullPath = this.expandRelativePath(pair.name);
                if (pair.valueReference) {
                    val = this.getPropertyValue(pair.valueReference.reference);
                    if (!val) val = apiService.sanitizeHTML(pair.valueReference.lastSavedValue);
                } else {
                    val = this.getPropertyValue(pair.value);                    
                }
                ReferenceHelper.addEntry(fullPath, val, this.caseData);
                let entries = this.componentRegistry[fullPath];
                if (entries) {
                    entries.forEach(entry => entry.setValue(val));
                }
            });
        }
    }

    handlePerform(evt, actionData) {
        return this.getAssignment(actionData.data.actionName);
    }

    async handleCreateWork() {
        try {
            this.showSpinner = true; 
            let caseData = ReferenceHelper.getPostContent(this.caseData);
            let postData = {
                caseTypeID: this.caseType,
                processID: this.processId,
                content:  caseData 
            };    
            let newCase = await apiService.createCase(this.url, postData);    
            if (newCase && newCase.ID) {
                this.caseId = newCase.ID;
                this.assignmentId =  newCase.nextAssignmentID;
                this.getAssignment();
                fireEvent(this.pageRef, 'workObjectCreated', newCase.ID);
            } else {
                apiService.showError("Could not create a new case", this);
                this.handleCancel();      
            }

            this.newHarnessView = null;
            this.processId = null;
            this.caseType = null;
        } catch (err) {
            apiService.showError(err, this);
            this.handleCancel();
        }
        this.showSpinner = false;
    }

    handleRunScript = (evt, actionData) => {
        let evalString = actionData.data.functionName + "(";
        if (actionData.data.functionParameters) {
          let paramString = actionData.data.functionParameters
            .map(param => {
                let val;
                if (param.valueReference) {
                    val = this.getPropertyValue(param.valueReference.reference, param.valueReference);
                    if (!val) val = apiService.sanitizeHTML(param.valueReference.lastSavedValue);
                } else {
                    val = this.getPropertyValue(param.value);
                }
        
                if (val === undefined || val === null) {
                    val = "null";
                } else if (typeof val === "string") {
                    val = `"${val}"`;
                }
                return val;
            }, this)
            .join(", "); 
            evalString += paramString;
        }
        evalString += ");";
        eval(evalString);
    }

    handleOpenUrl = (evt, actionData) => {
        let url;
        if (actionData.data.alternateDomain) {
            url = actionData.data.alternateDomain.url;
            if (!url && actionData.data.alternateDomain.urlReference)
                url = this.getPropertyValue(
                    actionData.data.alternateDomain.urlReference.reference,
                    actionData.data.alternateDomain.urlReference
                );
            if (!url) {
                url = apiService.sanitizeHTML(actionData.data.alternateDomain.urlReference.lastSavedValue);
            }
        }
    
        if (url.indexOf("http") !== 0) {
            url = "http://" + url.replace(/"/g, "");
        }
    
        let queryParams = actionData.data.queryParams
            .map(param => {
                let parmValue;
                if (param.value) parmValue = param.value;
                else if (param.valueReference.reference)
                parmValue = this.getPropertyValue(param.valueReference.reference, param.valueReference);
                if (!parmValue) parmValue = apiService.sanitizeHTML(param.valueReference.lastSavedValue);
                return `${param.name}=${parmValue}`.replace(/"/g, "");
            })
            .join("&");
    
        if (queryParams) url += "?" + queryParams;
        window.open(url, actionData.data.windowName, actionData.data.windowOptions);
    }    

    getPropertyValue = (property, valueReference) => {
        if (typeof property === "boolean") {
            return property;
        }
        let value;
        if (property.charAt(0) === '"') {
            value = property.replace(/"/g, "");
        } else {
            value = this.caseData[this.expandRelativePath(property)];
            if (valueReference && !value) {
                if (valueReference.lastSavedValue) return apiService.sanitizeHTML(valueReference.lastSavedValue);
                return null;
            }
        }
        if (!value) value = property;
        return value;
    }

    isCheckbox(reference) {
        if (this.componentRegistry[reference]) {
            let field = this.componentRegistry[reference][0].field;
            if (field && field.control && field.control.type === Field.fieldTypes.CHECKBOX) {
                return true;
            }
        }
        return false;
    }

    isDateTime(reference) {
        if (this.componentRegistry[reference]) {
            let field = this.componentRegistry[reference][0].field;
            if (field && field.control && field.control.type === Field.fieldTypes.DATETIME) {
                return true;
            }
        }
        return false;
	}
	
	handleCaseActions(evt) {
		debugger
		const selectedAction = evt.target.value;
		if (selectedAction === "Refresh") {
			this.handleFieldRefresh().then(() => Promise.resolve());
		} else {
			this.getAssignment(selectedAction);
		}
	}	
    
    handleFieldClicked = (field) => {
        if (!field) return;
        debugger
        const eventHandler = this.generateEventHandler(field);
        if (!eventHandler) return;
        eventHandler(field);
    }      

    handleFieldBlured = (evt) => {
        if (!evt) return;
        let value = evt.target.value;
        let reference = evt.target.dataset.reference;
        if (!reference) return;
        debugger
        // this.view = {...this.view};

        ReferenceHelper.addFieldData(reference, value, this.caseData);
	}
	
    handleFieldChanged = (evt, field) => {
        debugger
        if (!evt) return;
        let reference = evt.target.dataset.reference;
        if (!reference) return;
        let value = evt.target.value;
        if (this.isCheckbox(reference)) {
            value = evt.target.checked;
        } else if (this.isDateTime(reference)) {
            if (value) {
                value = value.replace(/[:-]/g, "");
                value = value.replace(/Z/, " GMT");
            }
        }
        if (!this.isCheckbox(reference) && !value) return;

        ReferenceHelper.addFieldData(reference, value, this.caseData);
        let eventHandler = this.generateEventHandler(field);
        this.componentRegistry[reference].forEach(itm => {
            if(itm !== evt.target && itm.setValue) itm.setValue(value);
        });
        if (!eventHandler) return;
        eventHandler(field);		
    }	

    reportError(reference, msg) {
        if (!reference || !msg) return;
        let v = this.template.querySelector('c-view');
        if (reference.startsWith(".")) reference = reference.substring(1);
        v.reportError(reference, msg);
    }  

    async handlePerformAction() {
        this.validationErrors = [];
        try {
            this.showSpinner = true; 
            let postData = ReferenceHelper.getPostContent(this.caseData);
            let content = { content:  postData };
            let assignment = await apiService.performAction(this.url, this.assignmentId, this.currentAction, content);
            this.assignmentId = assignment.nextAssignmentID;
            let workObject = await apiService.getCase(this.url, this.caseId);
            this.workObject = workObject;          
            this.componentRegistry = {};  
            if (this.assignmentId) {
                return this.getAssignment();
            } else if (assignment.nextPageID) {
                this.switchToConfirmMode();
                this.view = await apiService.getPage(this.url, this.caseId, assignment.nextPageID);
                this.view.visible = true;
                this.template.querySelector('c-view').setView(this.view);
                this.showSpinner = false; 
                // return this.view;
            } else {
                throw new Error("Invalid server response, please contact your administrator");
            }
        } catch (err) {
            this.showSpinner = false; 
            if (!err.errors) {
                apiService.showError(err, this);
            } else {
                let msgShown = false;
                if (this.isValidationError(err)) {
                    err.errors.forEach(error => {
                        if (error.ValidationMessages) {
                            error.ValidationMessages.forEach(msg => {
                                if (msg.Path) { 
                                    this.validationErrors.push(msg);
                                    msgShown = true;
                                } else if (!msgShown && error.ValidationMessages.length === 1){
                                    apiService.showError(msg.ValidationMessage, this);
                                    msgShown = true;
                                }
                            });
                        }
                    });
                } else {
                    apiService.showError(err, this);
                }
                if (this.isValidationError(err)) {
                    setTimeout(() => this.validationErrors.forEach(error => {
                            this.reportValidity(error.Path, error.ValidationMessage)
                        }), 100);
                }
            }       
        }
        return this.view;
    }

    switchToConfirmMode() {
        this.confirmHarnessMode = true;
        this.currentAction = "Confirm";
        this.fireChangeTitleEvent();
    }    

    isValidationError(err) {
        return err.errors.length > 0 && err.errors[0].ValidationMessages;
    }

    reportValidity = (reference, message) => {
        if (reference) {
            reference = reference.substring(1);
            if (this.componentRegistry[reference]) {
                this.componentRegistry[reference].forEach(entry => {
                    const input = entry.component;
                    if (input) {
                        input.setCustomValidity(message)
                        input.reportValidity();                
                    }
                });
            }   
        }
    }

    get hasErrors() {
        return this.validationErrors && this.validationErrors.length > 0;
    }

    openModalDialog() {
        let modal = this.template.querySelector('c-modal-dialog');
        modal.setView(this.caseDetails); 
        modal.openModal();
    }

    handleSubmit() {
        const allFieldsValid = Object.values(this.componentRegistry).reduce((isValid, itms) => {
            let componentValid = true;
            itms.forEach(itm => {
                if (itm.component) {
                    itm.component.setCustomValidity("");
                    itm.component.reportValidity();
                    componentValid = componentValid && itm.component.checkValidity();
                }
            });
            return isValid && componentValid;
        }, true);
        
        if (allFieldsValid) {
            this.handlePerformAction();
        } else {
            this.validationErrors.push({Path: "Validation errors", ValidationMessage: "invalid form data"});
        }
    }

    handleCancel() {
        const closeEvent = new CustomEvent('workoblectclosed', {
            detail: { 
                assignmentId: this.assignmentId,
                caseId: this.caseId 
            }
        });
        this.dispatchEvent(closeEvent);        
    }

    handleConfirm() {
        const closeEvent = new CustomEvent('workoblectclosed', {
            detail: { 
                assignmentId: this.assignmentId,
                caseId: this.caseId 
            }
        });
        this.dispatchEvent(closeEvent);
        fireEvent(this.pageRef, 'refreshAssignments');
    }     

    handleClick = () => {
        const closeEvent = new CustomEvent('workoblectclosed', {
            detail: { 
                assignmentId: this.assignmentId,
                caseId: this.caseId 
            }
        });
        this.dispatchEvent(closeEvent);        
    }

    getWorkObject = () => {
        return this.workObject;
    }

    async handleSave() {
        this.validationErrors = [];
        try {
            this.showSpinner = true;  
            let postData = ReferenceHelper.getPostContent(this.caseData);
            let content = { content:  postData };
            await apiService.updateCase(this.url, this.caseId, content, this.workObject.etag);
            let workObject = await apiService.getCase(this.url, this.caseId);
            this.workObject = workObject;            
            this.showSpinner = false;
            apiService.showMessage("Success", `Work object ${this.caseId.split(" ")[1]} successfully saved`, this);
        } catch (err) {
            this.showSpinner = false;  
            if (!err.errors) {
                apiService.showError(err, this);
            } else {
                err.errors.forEach(error => {
                    if (error.ValidationMessages) {
                        error.ValidationMessages.forEach(msg => {
                            if (msg.Path) {                                
                                this.validationErrors.push(msg);
                            }
                        });
                    } else {
                        debugger;
                    }
                });
                setTimeout(() => this.validationErrors.forEach(validationErr => {
                        this.reportValidity(validationErr.Path, validationErr.ValidationMessage)
                    }), 100);
            }       
        }
    }      
}