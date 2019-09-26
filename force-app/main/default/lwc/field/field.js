import { LightningElement, api, track } from 'lwc';
import CURRENCY from '@salesforce/i18n/currency';
import LOCALE from '@salesforce/i18n/locale';

import { apiService } from 'c/service';
import textInput from './textInput.html';
import textArea from './textArea.html';
import field from './field.html';
import dateTime from './dateTime.html';
import button from './button.html';
import hidden from './hidden.html';
import dropdown from './dropdown.html';
import radiogroup from './radiogroup.html';
import checkbox from './checkbox.html';
import link from './link.html';
import icon from './icon.html';
import paragraph from './paragraph.html';
import displayText from './displayText.html';
import autocomplete from './autocomplete.html';
import labelField from './label.html';
import { dataService } from './dataService';
// import { url } from 'inspector';

export default class Field extends LightningElement {
    @api fieldObject;
    @api hideLabel;
    @api registerComponent;
    @api fieldChangedHandler;
    @api fieldClickedHandler;
    @api fieldBluredHandler;
    @api getWorkObject;
    @api url;

    @track dropdownOptions = [];
    searchTerm;
    @track autocompleteOptions = [];
    @track showOptions;
    // @track value;
    value;

    privateValue;
    @track selectedOption;
    hasRendered;

    standardIcons = {
      pxIconAddItem: "utility:add",
      pxIconAddNewWork: "utility:new",
      pxIconAttachments: "utility:attach",
      pxCancel: "utility:close",
      pxIconDeleteItem: "utility:delete",
      pxIconExpandCollapse: "utility:steps",
      pxIconExplore: "utility:setting",
      pxIconFinishAssignment: "utility:task",
      pxIconHistory: "utility:rows",
      pxIconPrint: "utility:print",
      pxIconReopenWorkItem: "utility:share",
      pxIconReview: "utility:preview",
      pxIconSave: "utility:save",
      pxIconShowFlowLocation: "utility:location",
      pxIconSpellChecker: "utility:utility:check",
      pxIconUpdate: "record_update",
      pxIconShowReopenScreen: "utility:undo",
      "dot-3": "utility:threedots",
      "plus": "utility:add",
      "minus": "utility:minimize_window",
      "case": "utility:case",
      "home": "utility:home",
      "search": "utility:search",
      "arrow-right": "utility:chevronright",
      "reset": "utility:undo",
      "pencil": "utility:edit",
      "gear": "utility:setting",
      "trash": "utility:trash",
      "information": "utility:info",
      "help": "utility:help",
      "warn": "utility:warning"
    };

    static get sourceTypes() {
      return {
        DATAPAGE: "datapage",
        PAGELIST: "pageList",
        CONSTANT: "constant",
        LOCAL_LIST: "locallist",
        TEXT: "Text"
      };
    } 

    static get iconSources() {
      return {
        STANDARD: "standardIcon",
        IMAGE: "image",
        EXTERNAL_URL: "exturl",
        PROPERTY: "property",
        STYLECLASS: "styleclass"
      };
    }

    static get fieldTypes() {
        return {
          TEXTINPUT: "pxTextInput",
          DROPDOWN: "pxDropdown",
          CHECKBOX: "pxCheckbox",
          TEXTAREA: "pxTextArea",
          REPEATING: "repeating",
          TABLELAYOUT: "tableLayout",
          EMAIL: "pxEmail",
          DATETIME: "pxDateTime",
          INTEGER: "pxInteger",
          PHONE: "pxPhone",
          DISPLAYTEXT: "pxDisplayText",
          HIDDEN: "pxHidden",
          BUTTON: "pxButton",
          LABEL: "label",
          LINK: "pxLink",
          URL: "pxURL",
          ICON: "pxIcon",
          RADIOBUTTONS: "pxRadioButtons",
          AUTOCOMPLETE: "pxAutoComplete",
          CURRENCY: "pxCurrency",
          PXSUBSCRIPT: ""
      };
    }

    constructor() {
      super();
      RegExp.escape = function(s) {
        return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      };
    }

    connectedCallback() { }

    renderedCallback() {    
      if (!this.hasRendered && this.registerComponent) {
        //
        // TODO: handle all inputs
        //
        const component = this.template.querySelector("lightning-input");
        this.registerComponent(this.fieldObject.reference, this.fieldObject, component, this.setValue);
      }

      if (!this.hasRendered && !this.isParagraph() && !this.isCaption()) {
        this.value = this.fieldObject.value;
        if (this.fieldObject.control && (this.isDropdown() || this.isAutoComplete())) {
          this.selectedOption = this.value;
          if (this.dropdownOptions.length === 0) {
              dataService.setDropdownOptions(this.url, this.fieldObject, this.getWorkObject(), this, options => {this.dropdownOptions = options});
          }
        } else if (this.fieldObject.control && this.isDateTime()) {
          this.value = this.fieldObject.value.replace(" GMT", "Z");
        }
        this.hasRendered = true;
      }
    }

    @api
    setValue = value => {
      if (value === this.value) return;
      this.value = value;
      this.fieldObject = {...this.fieldObject, value};
    }
	
    render() {
      if (this.fieldObject) {
        if (this.isCaption()) {
          return labelField;                
        }
        if (this.fieldObject.visible) {
          if (this.isParagraph())
            return paragraph;  
          if (this.isDisplayText() || this.readonly)
            return displayText;            
          if (this.isTextInput()) 
              return textInput;
          if (this.isDateTime()) 
              return dateTime;
          if (this.isTextArea()) 
            return textArea;
          if (this.isButtton()) 
            return button;
          if (this.isHidden()) 
            return hidden;
          if (this.isDropdown())
            return dropdown;
          if (this.isRadioButton())
            return radiogroup;
          if (this.isCheckbox())
            return checkbox;
          if (this.isLink())
            return link;
          if (this.isIcon())
            return icon;
          if (this.isAutoComplete())
            return autocomplete;     
        }                   
      }
      return field;
    }	

    fireFieldChangeEvent(evt) {
      let value = evt.target.value;
      this.value = value;
      let reference = evt.target.dataset.reference;

      const fieldChangeEvent = new CustomEvent('fieldchanged', {
          bubbles: true,
          composed:true,
          detail: { 
              reference,
              value 
          }
      });
      this.dispatchEvent(fieldChangeEvent);  
    }

    handleClick = (evt) => {
      if (evt.preventDefault 
        && this.fieldObject.control.actionSets 
        && this.fieldObject.control.actionSets.length > 0 ) {
        evt.preventDefault();
      }
      this.fieldClickedHandler(this.fieldObject);
    }

    handleChange = (evt) => {
      debugger
      this.fieldChangedHandler(evt, this.fieldObject);
    }    

    get radiogroupOptions() {
      if (this.fieldObject.control.modes) {
       return this.fieldObject.control.modes[0].options.map(option => {
          return { 
              label: option.value, 
              value: option.key
          };
        });
      }
      return [];
    }

    handleClearSearch(evt) {
      if (evt.target.value === this.searchTerm) return;
      this.searchTerm = "";
      this.showOptions = false;
    }
    
    setAutocompleteOptions() {
      if (!this.dropdownOptions) return;
      let options = [...this.dropdownOptions];
      options = options.filter(itm => RegExp.escape(itm.value).search(new RegExp(this.searchTerm, "i")) !== -1);
      this.autocompleteOptions = options;
      if (options.length > 0) this.showOptions = true;
    }

    setOption = (option) => {
      setTimeout(() => {
          this.fieldChangedHandler({
            target: {
              dataset: { reference: this.fieldObject.reference },
              value: option
            }
          }, this);
          
      }, 100);
    }

    // handleSelectOption(evt) {
    //   debugger;
    //   let option = evt.target.parentElement.dataset.option;
    //   if (!option) 
    //       option = evt.target.dataset.option;      
    //   this.setOption(option);
    //   this.showOptions = false;
    // }

    handleSelectOption(evt) {
      let option = evt.target.dataset.option;
      if (!option) {
        option = evt.target.parentElement.dataset.option;
      }
      this.selectedOption = option;
      this.showOptions = false;
      this.setOption(option);
    }

    setDropdownOptions() {
      if (!this.fieldObject || !this.fieldObject.control 
          || !this.fieldObject.control.modes || this.fieldObject.control.modes.length === 0) 
          return;
      let mode = this.fieldObject.control.modes[0];
      if (mode && mode.listSource === Field.sourceTypes.DATAPAGE) {
        this.dropdownOptionsFromDataPage(mode);
      } else if (mode && mode.listSource === Field.sourceTypes.PAGELIST) {
        this.optionsFromPageList(mode);
      } else if (mode && mode.listSource === Field.sourceTypes.LOCAL_LIST && mode.options) {
        this.optionsFromLocalList(mode);
      }
    }

    handleSearchTermChange(evt) {
      this.searchTerm = evt.target.value;
      if (!this.searchTerm || this.searchTerm.length === 0) {
        this.showOptions = false;
        return;
      }
      this.setAutocompleteOptions();
    }

    optionsFromPageList() {
      let pageId = this.fieldObject.control.modes[0].clipboardPageID;
      let clipboardPagePrompt = this.fieldObject.control.modes[0].clipboardPagePrompt;
      let clipboardPageValue = this.fieldObject.control.modes[0].clipboardPageValue;
      if (pageId && clipboardPagePrompt && clipboardPageValue) {
          let workObject = this.getWorkObject();
          if (workObject) {
            let optionsPage = workObject.content[pageId];
            if (optionsPage && optionsPage.length > 0) {
                this.dropdownOptions = optionsPage.map(item => {
                    return {
                      label: item[clipboardPagePrompt],
                      value: item[clipboardPageValue]
                    };
                });
            }
          }
      }
    }

    optionsFromLocalList(mode) {
      this.dropdownOptions = mode.options.map(option => {
        return {
          label: option.key,
          value: option.value
        };
      });
    }

    async dropdownOptionsFromDataPage(mode) {
      try {
        let pageId = mode.dataPageID;
        let propertyName = mode.dataPageValue;
        let propertyPrompt = mode.dataPagePrompt;
        let pageParams = {};
        let data = await apiService.getDataPage(this.url, pageId, pageParams);
        let options = this.convertDataPageToOptions(data, propertyName, propertyPrompt);
        this.dropdownOptions = options;
      } catch (error) {
        apiService.showError(error, this);
        this.dropdownOptions = [{ label: error, value: error }];
      }
    }

    convertDataPageToOptions(dataPage, propertyName, propertyPrompt) {
      let options = [];
      if (propertyName.indexOf(".") === 0) {
          propertyName = propertyName.substring(1);
      }

      dataPage.pxResults.forEach(result => {
          if (result[propertyName]) {
              options.push({
                  label: result[propertyPrompt],
                  value: result[propertyName]
              });
          }
        });
      return options;
    }

    getPropertyValue(property) {
      if (typeof property === "boolean") {
          return property;
      }
      if (property.charAt(0) === '"') {
          return property.replace(/"/g, "");
      }
      if (property.charAt(0) === ".") {
          return this.state.values[this.expandRelativePath(property)];
      }
      return property;
    }    
      
    @api
    reportError(reference, msg) {
        if (this.fieldObject.reference === reference) {
            let input = this.template.querySelector("lightning-input");
            input.setCustomValidity(msg);
            input.reportValidity();
        }
    }

    isCheckbox() {
        return this.fieldObject.control.type === Field.fieldTypes.CHECKBOX;
    }

    isRadioButton() {
        return this.fieldObject.control.type === Field.fieldTypes.RADIOBUTTONS;
    }    

    isAutoComplete() {
        return this.fieldObject.control.type === Field.fieldTypes.AUTOCOMPLETE;
    }

    isDropdown() {
        return this.fieldObject.control.type === Field.fieldTypes.DROPDOWN;
    }
    
    isHidden() {
      return  this.fieldObject.control.type === Field.fieldTypes.HIDDEN;
    }

    isTextArea() {
        return this.fieldObject.control.type ===  Field.fieldTypes.TEXTAREA;
    }

    isParagraph() {
        return this.fieldObject.paragraphID && this.fieldObject.paragraphID.length > 0;
    }

    isCaption() {
      return this.fieldObject.hasOwnProperty("captionFor");
    }

    isTextInput() {
      return this.fieldObject.control.type === Field.fieldTypes.TEXTINPUT
        || this.fieldObject.control.type === Field.fieldTypes.PHONE
        || this.fieldObject.control.type === Field.fieldTypes.EMAIL
        || this.fieldObject.control.type === Field.fieldTypes.INTEGER
        || this.fieldObject.control.type === Field.fieldTypes.URL          
        || this.fieldObject.control.type === Field.fieldTypes.CURRENCY;
    }
    
    isDateTime() {
        let b = this.fieldObject.control.type === Field.fieldTypes.DATETIME;
        return b;
    }

    get value() {
        return apiService.sanitizeHTML(this.fieldObject.value);
    }

    set value(val) {
      if (val || val === "") {
        this.privateValue = val;
        this.setAttribute("value", val);
      }
    }

    get fieldDataExists() {
      return typeof this.fieldObject && this.fieldObject.control;
    }

    get href() {
      const linkMode = this.fieldObject.control.modes[0] ? this.fieldObject.control.modes[0] : {};
      const href = this.getPropertyValue(linkMode.linkData);
      return href ? href : "#";
    }

    get textInputVariant() {
      return "Neutral";
    }

    get isVisible() {
      return this.fieldObject && this.fieldObject.visible;
    }

    get iconName() {
      let iconName = "utility:info";
      if (this.fieldObject.control && this.fieldObject.control.modes) {
        const iconMode = this.fieldObject.control.modes[0] ? this.fieldObject.control.modes[0] : {};
        if (iconMode.iconSource === Field.iconSources.STANDARD) {
          iconName = this.standardIcons[iconMode.iconStandard];
        } else if (iconMode.iconSource === Field.iconSources.STYLECLASS) {
          let iconStyle = iconMode.iconStyle;
          if (iconStyle.indexOf("pi") >= 0) {
            iconStyle = iconStyle.replace(/pi pi-/gi, "");
            iconName = this.standardIcons[iconStyle];
          }
        }
      }
      return iconName ? iconName : "utility:info";
    }

    get currencyCode() {
      return CURRENCY;
    }

    get locale() {
      return LOCALE;
    }

    get buttonVariant() {
      let buttonFormat = "Neutral";
      if (
        this.fieldObject &&
        this.fieldObject.control &&
        this.fieldObject.control.modes &&
        this.fieldObject.control.modes.length > 1
      ) {
        let format = this.fieldObject.control.modes[1].controlFormat;
        if (format) {
          format = format.toUpperCase();
          if (format !== "STANDARD" && format !== "PZHC") {
            if (format === "STRONG") buttonFormat = "brand";
            else if (format === "LIGHT") {
              buttonFormat = "";
            } else if (format === "RED") buttonFormat = "destructive";
          }
        }
      }
      return buttonFormat;
    }

    get linkStyle() {
      let linkFormat = "";
      if (
        this.fieldObject &&
        this.fieldObject.control &&
        this.fieldObject.control.modes &&
        this.fieldObject.control.modes.length > 1
      ) {
        let format = this.fieldObject.control.modes[1].controlFormat;
        if (format) {
          format = format.toUpperCase();
          if (format === "STRONG") linkFormat = "fontWeight: bolder";
          else if (format === "LIGHT") {
            linkFormat = "fontWeight: lighter; color: lightgray";
          } else if (format === "STANDARD" && format === "PZHC")
            linkFormat = "fontWeight: normal";
          else if (format === "RED") linkFormat = "color: red";
        }
      }
      return linkFormat;
    }

    get label() {
      if (this.hideLabel) return "";
      if (this.isButtton() || this.isLink() || this.isCheckbox()) {
        if (this.fieldObject.control && this.fieldObject.control.label) {
          return this.getPropertyValue(this.fieldObject.control.label);
        } 
        return apiService.sanitizeHTML(this.fieldObject.label);
      }
      return apiService.sanitizeHTML(this.fieldObject.label);
    }

    get fieldLabel() {
      const label = this.fieldObject.label && this.fieldObject.showLabel ? this.fieldObject.label : undefined;
      if (label) return apiService.sanitizeHTML(label);
      return label;
    }

    get disabled() {
      if (this.isCheckbox() || this.isRadioButton()) {
        return this.readonly || this.fieldObject.disabled === true;
      }
      return this.fieldObject.disabled === true;
    }

    get required() {
      return this.fieldObject.required === true;
    }

    get readonly() {
      return this.fieldObject.readOnly === true;
    }   

    get placeholder() {
      let placeholder;
      if (
        this.fieldObject &&
        this.fieldObject.control &&
        this.fieldObject.control.modes &&
        this.fieldObject.control.modes.length > 0
      ) {
        placeholder = this.fieldObject.control.modes[0].placeholder;
      }
      return placeholder;
    }
    
    get tooltip() {
      let tooltip = "";
      if (
          this.fieldObject &&
          this.fieldObject.control &&
          this.fieldObject.control.modes &&
          this.fieldObject.control.modes.length > 1
      ) {
        if (
          this.fieldObject.control.type === Field.fieldTypes.BUTTON ||
          this.fieldObject.control.type === Field.fieldTypes.LINK ||
          this.fieldObject.control.type === Field.fieldTypes.ICON
        ) {
          if (this.fieldObject.control.modes[1].tooltip) {
            tooltip = this.fieldObject.control.modes[1].tooltip;
          }
        } else {
          if (this.fieldObject.control.modes[0].tooltip) {
            tooltip = this.fieldObject.control.modes[0].tooltip;
          }
        }
      }
      return apiService.sanitizeHTML(tooltip);
    }

    get richText() {
      return this.fieldObject.value;
    }
    
    get checked() {
      return this.fieldObject && (this.fieldObject.value === "true" || this.fieldObject.value === true);
    }    
  
    get formatReadWritetType() {
        let type = "text";
        if (!this.fieldObject.control || !this.fieldObject.control.modes) {
          return type;
        }
        let fieldType = this.fieldObject.control.type;
        if (fieldType === Field.fieldTypes.DATETIME) {
          if (this.fieldObject.type.toUpperCase() === "DATE") type =  "date";
          else if(this.fieldObject.type.toUpperCase() === "DATE TIME") type =  "datetime";
          else type = "date";
        }
        if (this.fieldObject.control.modes.length < 1) {
          return type;
        }

        let formatType = this.fieldObject.control.modes[0].formatType;
        if (fieldType === Field.fieldTypes.EMAIL || formatType === "email") {
          type = "email";
        } else if (fieldType === Field.fieldTypes.PHONE || formatType === "tel") {
          type = "tel";
        } else if (fieldType === Field.fieldTypes.URL || formatType === "url") {
          type = "url";
        } else if (
          fieldType === Field.fieldTypes.INTEGER ||
          fieldType === Field.fieldTypes.CURRENCY ||
          formatType === "number"
        ) {
          type = "number";
        } 
        return type;
    }

    get isFormattedText() {
      if (!this.fieldObject) return false;
      if (this.fieldObject && this.fieldObject.control && this.fieldObject.control.modes.length > 0 && this.fieldObject.value) {
          let mode = this.fieldObject.control.modes[1];
          if (!mode) return false;
          if ((mode.dateFormat && mode.dateFormat.match(/Date-/i)) 
              || (mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i)
              || mode.formatType === "number"
              || (mode.formatType === "text" && (mode.autoAppend || mode.autoPrepend)) 
              || mode.formatType === "truefalse")
              || mode.formatType === "email"
              || mode.formatType === "tel"
              || mode.formatType === "url"
              || mode.formatType === "text" && (mode.autoAppend || mode.autoPrepend)) {
              return true;
          }
      }
      return false;
    }

    get isFormattedString() {
      if (!this.isFormattedText) return false;
      let mode = this.fieldObject.control.modes[1];
      return mode.formatType === "text" && (mode.autoAppend || mode.autoPrepend);   
    }

    get isFormattedNumber() {
      if (!this.isFormattedText) return false;
      let mode = this.fieldObject.control.modes[1];
      return mode.formatType === "number" && mode.numberSymbol !== "currency";
    }

    get isFormattedCurrency() {
      if (!this.isFormattedText) return false;
      let mode = this.fieldObject.control.modes[1];
      return mode.formatType === "number" && mode.numberSymbol === "currency";
    }   
    
    get isFormattedTrueFalse() {
      if (!this.isFormattedText) return false;
      let mode = this.fieldObject.control.modes[1];
      return mode.formatType === "truefalse";
    } 

    get isFormattedDate() {
        if (!this.isFormattedText) return false;
        let mode = this.fieldObject.control.modes[1];
        return (mode.dateFormat && mode.dateFormat.match(/Date-/i));
    }

    get isFormattedDateTime() {
        if (!this.isFormattedText) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i);
    }

    get isFormattedEmail() {
        if (!this.isFormattedText) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "email";
    }

    get isFormattedUrl() {
        if (!this.isFormattedText) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "url";
    }

    get isFormattedTel() {
        if (!this.isFormattedText) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "tel";
    }        

    get formattedValue() {
        if (!this.isFormattedText) return "";
        let mode = this.fieldObject.control.modes[1];
        let returnValue = this.fieldObject.value;

        if (mode.formatType === "text" && (mode.autoAppend || mode.autoPrepend)) {
            returnValue = mode.autoPrepend ? mode.autoPrepend + returnValue : returnValue;
            returnValue = mode.autoAppend ? returnValue + mode.autoAppend : returnValue;
        } else if (mode.formatType === "truefalse") {
            if (returnValue === "false") returnValue = mode.falseLabel;
            else returnValue = mode.trueLabel;
        }
        
        return returnValue;
    }

    get month() {
      let mode = this.fieldObject.control.modes[1];
      if (mode.dateTimeFormat && mode.dateTimeFormat === "DateTime-Short")
          return "2-digit";
      if (mode.dateFormat && mode.dateFormat === "Date-Short")
          return "2-digit";
      return "long";
    }
    
    get dateValue() {
        let mode = this.fieldObject.control.modes[1];
        if (!mode) return "";
        let value;
        if ((mode.dateFormat && (mode.dateFormat.match(/Date-/i))
        || (mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i) && this.fieldObject.value.length === 8))) {
            value = this.fieldObject.value ? this.fieldObject.value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3T00:00") : "";
        } else if (mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i)) {
            value = this.fieldObject.value ? this.fieldObject.value.replace(/(\d{4})(\d{2})(\d{2}T\d{2})(\d{2})(\S+)( GMT)/, "$1-$2-$3:$4:$5Z") : "";
        }
        return value ? new Date(value) : "";
    }

    isDisplayText() {
        return this.fieldObject.control.type === Field.fieldTypes.DISPLAYTEXT;
    }

    isButtton() {
        return this.fieldObject.control.type === Field.fieldTypes.BUTTON;
    }

    isLabel() {
        return this.fieldObject.control.type === Field.fieldTypes.LABEL;
    }

    isLink() {
        return this.fieldObject.control.type === Field.fieldTypes.LINK;
    }   
    
    isIcon() {
        return this.fieldObject.control.type === Field.fieldTypes.ICON;
    } 
    
    isLHidden() {
        return this.fieldObject.control.type === Field.fieldTypes.HIDDEN;
    } 
    
    isSubscript() {
        return this.fieldObject.control.type === Field.fieldTypes.PXSUBSCRIPT;
    }
}