import { apiService } from 'c/service' 

export default class FieldData {
    fieldObject;

    static get sourceTypes() {
      return {
        DATAPAGE: "datapage",
        PAGELIST: "pageList",
        CONSTANT: "constant",
        LOCAL_LIST: "locallist",
        TEXT: "Text"
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

    static get iconSources() {
      return {
        STANDARD: "standardIcon",
        IMAGE: "image",
        EXTERNAL_URL: "exturl",
        PROPERTY: "property",
        STYLECLASS: "styleclass"
      };
    }

    static get standardIcons() {
      return {
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
    }

    constructor(field) {
        this.fieldObject = field;
    }

    getlabel() {
        if (this.isButtton() || this.isLink() || this.isCheckbox()) {
          if (this.fieldObject.control && this.fieldObject.control.label) {
            return this.getPropertyValue(this.fieldObject.control.label);
          } 
        }
        return this.fieldObject.label;
    }

    setDropdownOptions(workObject, setOptions) {
        if (!this.fieldObject || !this.fieldObject.control 
            || !this.fieldObject.control.modes || this.fieldObject.control.modes.length === 0) 
            setOptions([]);
        let mode = this.fieldObject.control.modes[0];
        if (mode && mode.listSource === FieldData.sourceTypes.DATAPAGE) {
            this.dropdownOptionsFromDataPage(mode, setOptions);
        } else if (mode && mode.listSource === FieldData.sourceTypes.PAGELIST) {
            this.optionsFromPageList(workObject, setOptions);
        } else if (mode && mode.listSource === FieldData.sourceTypes.LOCAL_LIST && mode.options) {
            this.optionsFromLocalList(mode, setOptions);
        }
    }
    
    async dropdownOptionsFromDataPage(mode, setOptions) {
        let pageId = mode.dataPageID;
        let propertyName = mode.dataPageValue;
        let propertyPrompt = mode.dataPagePrompt;
        let pageParams = {};
        let data = await apiService.getDataPage(pageId, pageParams);
        let options = this.convertDataPageToOptions(data, propertyName, propertyPrompt);
        setOptions(options);
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
    
    optionsFromPageList(workObject, setOptions) {
        let pageId = this.fieldObject.control.modes[0].clipboardPageID;
        let clipboardPagePrompt = this.fieldObject.control.modes[0].clipboardPagePrompt;
        let clipboardPageValue = this.fieldObject.control.modes[0].clipboardPageValue;
        let options = [];
        if (pageId && clipboardPagePrompt && clipboardPageValue) {
            if (workObject) {
              let optionsPage = workObject.content[pageId];
              if (optionsPage && optionsPage.length > 0) {
                  options = optionsPage.map(item => {
                      return {
                        label: item[clipboardPagePrompt],
                        value: item[clipboardPageValue]
                      };
                  });
              }
            }
        }
        setOptions(options);
    }
    
    optionsFromLocalList(mode, setOptions) {
        let options = mode.options.map(option => {
          return {
            label: option.key,
            value: option.value
          };
        });
    
        setOptions(options);
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

    getHref() {
        const linkMode = this.fieldObject.control.modes[0] ? this.fieldObject.control.modes[0] : {};
        const href = this.getPropertyValue(linkMode.linkData);
        return href ? href : "#";
    }

    isDisplayText() {
        return this.fieldObject.control.type === FieldData.fieldTypes.DISPLAYTEXT;
    }

    getTooltip() {
        let tooltip = "";
        if (
            this.fieldObject &&
            this.fieldObject.control &&
            this.fieldObject.control.modes &&
            this.fieldObject.control.modes.length > 1
        ) {
          if (this.isButtton() || this.isLink() || this.isIcon()) {
            if (this.fieldObject.control.modes[1].tooltip) {
              tooltip = this.fieldObject.control.modes[1].tooltip;
            }
          } else {
            if (this.fieldObject.control.modes[0].tooltip) {
              tooltip = this.fieldObject.control.modes[0].tooltip;
            }
          }
        }
        return tooltip;
    }

    isFormattedText() {
        if (!this.fieldObject) return false;
        if (this.fieldObject && this.fieldObject.control 
            && this.fieldObject.control.modes.length > 0 && this.fieldObject.value) {
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
    
    isButtton() {
        return this.fieldObject.control.type === FieldData.fieldTypes.BUTTON;
    }
    
    isLabel() {
        return this.fieldObject.control.type === FieldData.fieldTypes.LABEL;
    }
    
    isLink() {
        return this.fieldObject.control.type === FieldData.fieldTypes.LINK;
    }   
    
    isIcon() {
        return this.fieldObject.control.type === FieldData.fieldTypes.ICON;
    } 
    
    isLHidden() {
        return this.fieldObject.control.type === FieldData.fieldTypes.HIDDEN;
    } 
    
    isSubscript() {
        return this.fieldObject.control.type === FieldData.fieldTypes.PXSUBSCRIPT;
    }
    
    isCheckbox() {
        return this.fieldObject.control.type === FieldData.fieldTypes.CHECKBOX;
    }
    
    isRadioButton() {
        return this.fieldObject.control.type === FieldData.fieldTypes.RADIOBUTTONS;
    }    
    
    isAutoComplete() {
        return this.fieldObject.control.type === FieldData.fieldTypes.AUTOCOMPLETE;
    }
    
    isDropdown() {
        return this.fieldObject.control.type === FieldData.fieldTypes.DROPDOWN;
    }
    
    isHidden() {
        return this.fieldObject.control.type === FieldData.fieldTypes.HIDDEN;
    }
    
    isTextArea() {
        return this.fieldObject.control.type ===  FieldData.fieldTypes.TEXTAREA;
    }
    
    isParagraph() {
        return this.fieldObject.hasOwnProperty("paragraphID");
    }
    
    isCaption() {
        return this.fieldObject.hasOwnProperty("captionFor");
    }

    isFormattedString() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "text" && (mode.autoAppend || mode.autoPrepend);   
    }
    
    isFormattedNumber() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "number" && mode.numberSymbol !== "currency";
    }
    
    isFormattedCurrency() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "number" && mode.numberSymbol === "currency";
    }   
    
    isFormattedTrueFalse() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "truefalse";
    } 
    
    isFormattedDate() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return (mode.dateFormat && mode.dateFormat.match(/Date-/i));
    }
    
    isFormattedDateTime() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i);
    }
    
    isFormattedEmail() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "email";
    }
    
    isFormattedUrl() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "url";
    }
    
    isFormattedTel() {
        if (!this.isFormattedText()) return false;
        let mode = this.fieldObject.control.modes[1];
        return mode.formatType === "tel";
    }

    isDisabled() {
        if (this.isCheckbox() || this.isRadioButton()) {
          return this.isReadonly() || this.fieldObject.disabled === true;
        }
        return this.fieldObject.disabled === true;
    }

    getFormattedValue() {
        if (!this.isFormattedText()) return "";
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

    isTextInput() {
        return this.fieldObject.control.type === FieldData.fieldTypes.TEXTINPUT
          || this.fieldObject.control.type === FieldData.fieldTypes.PHONE
          || this.fieldObject.control.type === FieldData.fieldTypes.EMAIL
          || this.fieldObject.control.type === FieldData.fieldTypes.INTEGER
          || this.fieldObject.control.type === FieldData.fieldTypes.URL          
          || this.fieldObject.control.type === FieldData.fieldTypes.CURRENCY;
      }
      
    isDateTime() {
        return this.fieldObject.control.type === FieldData.fieldTypes.DATETIME;
    }
      
      
      
    getRadiogroupOptions() {
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
      
    getFieldLabel() {
        return this.fieldObject.label && this.fieldObject.showLabel ? this.fieldObject.label : undefined;
    }
      
    getRichText() {
        return this.fieldObject.value;
    }
      
      
      
    isChecked() {
        return this.fieldObject && (this.fieldObject.value === "true" || this.fieldObject.value === true);
    }
      
    isRequired() {
        return this.fieldObject.required === true;
    }
      
    isReadonly() {
        return this.fieldObject.readOnly === true;
    }
      
    isVisible() {
        return this.fieldObject && this.fieldObject.visible;
    }
      
    getReference() {
        return this.fieldObject.reference;
    }
      
    getDateValue() {
        let mode = this.fieldObject.control.modes[1];
        if (!mode) return "";
        let value;
        if ((mode.dateFormat && (mode.dateFormat.match(/Date-/i))
            || (mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i) 
            && this.fieldObject.value.length === 8))) {
              value = this.fieldObject.value ? this.fieldObject.value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3T00:00") : "";
          } else if (mode.dateTimeFormat && mode.dateTimeFormat.match(/DateTime-/i)) {
              value = this.fieldObject.value ? this.fieldObject.value.replace(/(\d{4})(\d{2})(\d{2}T\d{2})(\d{2})(\S+)( GMT)/, "$1-$2-$3:$4:$5Z") : "";
          }
          return value ? new Date(value) : "";
    }
      
    getLinkStyle() {
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
      
    getButtonVariant() {
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
      
    getFormatReadWritetType() {
          let type = "text";
          if (
            !this.fieldObject.control ||
            !this.fieldObject.control.modes ||
            this.fieldObject.control.modes.length < 1
          ) {
            return type;
          }
          let fieldType = this.fieldObject.control.type;
          let formatType = this.fieldObject.control.modes[0].formatType;
          if (fieldType === FieldData.fieldTypes.EMAIL || formatType === "email") {
            type = "email";
          } else if (fieldType === FieldData.fieldTypes.PHONE || formatType === "tel") {
            type = "tel";
          } else if (fieldType === FieldData.fieldTypes.URL || formatType === "url") {
            type = "url";
          } else if (
            fieldType === FieldData.fieldTypes.INTEGER ||
            fieldType === FieldData.fieldTypes.CURRENCY ||
            formatType === "number"
          ) {
            type = "number";
          } else if (fieldType === FieldData.fieldTypes.DATETIME) {
              if (this.fieldObject.type === "date") type =  "date";
              else if(this.fieldObject.type === "Date Time") type =  "datetime";
              else type = "date";
          }
          return type;
    }
      
    getIconName() {
        let iconName = "utility:info";
        if (this.fieldObject.control && this.fieldObject.control.modes) {
            const iconMode = this.fieldObject.control.modes[0] ? this.fieldObject.control.modes[0] : {};
            if (iconMode.iconSource === FieldData.iconSources.STANDARD) {
              iconName = FieldData.standardIcons[iconMode.iconStandard];
            } else if (iconMode.iconSource === FieldData.iconSources.STYLECLASS) {
              let iconStyle = iconMode.iconStyle;
              if (iconStyle.indexOf("pi") >= 0) {
                iconStyle = iconStyle.replace(/pi pi-/gi, "");
                iconName = FieldData.standardIcons[iconStyle];
              }
            }
          }
          return iconName ? iconName : "utility:info";
    }
      
    getMonth() {
          let mode = this.fieldObject.control.modes[1];
          if (mode.dateTimeFormat && mode.dateTimeFormat === "DateTime-Short")
              return "2-digit";
          if (mode.dateFormat && mode.dateFormat === "Date-Short")
              return "2-digit";
          return "long";
      }
      
    getValue() {
          return this.fieldObject.value;
    }
      
    getNumberDecimalPlaces() {
          let mode = this.fieldObject.control.modes[1];
          let decimalPlaces = mode.decimalPlaces;
          if (!decimalPlaces) decimalPlaces = 2;
          return decimalPlaces;
    }    
}



// function getlabel(fieldObject) {
//     if (isButtton(fieldObject) || isLink(fieldObject) || isCheckbox(fieldObject)) {
//       if (fieldObject.control && fieldObject.control.label) {
//         return getPropertyValue(fieldObject.control.label);
//       } 
//       return fieldObject.label;
//     }
//     return fieldObject.label;
// }