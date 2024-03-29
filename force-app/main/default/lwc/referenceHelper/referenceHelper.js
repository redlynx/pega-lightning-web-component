import Field from "c/field";

/**
 * Class to handle translating Pega's fully qualified property paths
 * to a nested Object structure, and vice versa.
 * Also some utility methods for:
 * - Handling initial PegaForm state given View from API
 * - Finding correct PageGroup/List based on property reference
 * - Getting blank entry for PageGroup/List when adding new element
 * When posting data to the server via API, it must be nested.
 * When retrieving field information from the server, the property paths are flat and qualified.
 */
export default class ReferenceHelper {
  /**
   * Turn simple object with flat references into nested object to be POSTed.
   * E.g. { "pyWorkPage.Address.Street": "1 Rogers St" } --> {"Address":{"Street":"1 Rogers St"}}
   * Handles nested page lists and page groups.
   * @param { Object } newValues - An object containing fully qualified property paths as keys.
   * @return { Object } Object with nested keys and values corresponding to property paths.
   */
  static getPostContent(newValues, componentRegistry) {
    let content = {};

    Object.keys(newValues).forEach(key => {
      ReferenceHelper.addEntry(key, newValues[key], content, componentRegistry);
    });

    return content;
  }

  /**
   * Add entry in nested object for each flat fully qualified key.
   * @param { String } key - fully qualified path, e.g. pyWorkPage.Address.Street
   * @param { String } value - value corresponding to key
   * @param { Object } content - Object into which to add entry
   */
  static addEntry(key, value, content, componentRegistry) {
    let propertyPathParts = key.split(".");
    let propertyName = propertyPathParts.pop();

    for (let i = 0; i < propertyPathParts.length; i++) {
      let pathPart = propertyPathParts[i];

      // Do not include pyWorkPage in content
      if (pathPart === "pyWorkPage") {
        continue;
      }

      // regex to match repeating references (PageList / PageGroup)
      if (/(.*)[(].+[)]$/.test(pathPart)) {
        // Use regex to split on parens to get ref and index, use filter to remove empty string at end
        let pageListParts = pathPart.split(/[()]/).filter(Boolean);
        let pageName = pageListParts[0];
        let pageIndex = pageListParts[1];

        if (isNaN(pageIndex)) {
          // Handling page group (associative array)
          if (!content[pageName]) {
            content[pageName] = { [pageIndex]: {} };
          }

          if (!content[pageName][pageIndex]) {
            content[pageName][pageIndex] = {};
          }

          content = content[pageName][pageIndex];
        } else {
          // Handling page list (1-indexed array)
          pageIndex = parseInt(pageIndex, 10);

          if (!content[pageName]) {
            content[pageName] = [];
          }

          for (let j = 0; j < pageIndex; j++) {
            if (!content[pageName][j]) {
              content[pageName][j] = {};
            }

            // if we are in the last iteration, that is the next object we want to nest into
            if (j === pageIndex - 1) {
              content = content[pageName][j];
            }
          }
        }
      } else {
        // We are dealing with a simple page, not list/group
        if (!content[pathPart]) {
          content[pathPart] = {};
        }
        content = content[pathPart];
      }
    }
    if (key !== "refreshFor") {
      if (ReferenceHelper.isDate(key, componentRegistry)) {
        value = value.replaceAll("-", "");
      } else if (ReferenceHelper.isDateTime(key, componentRegistry)) {
        value = value.replace(
          /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})[.]\d{3}(Z)$/,
          "$1$2$3T$4$500.000 GMT"
        );
      }
    } 
    content[propertyName] = value;
  }

  static isDateTime(reference, componentRegistry) {
    if (componentRegistry[reference]) {
      let field = componentRegistry[reference][0].field;
      if (
        field &&
        field.control &&
        field.control.type === Field.fieldTypes.DATETIME
      ) {
        return true;
      }
    }
    return false;
  }

  static isDate(reference, componentRegistry) {
    if (componentRegistry[reference]) {
      let field = componentRegistry[reference][0].field;
      if (
        field.type === "Date" &&
        field.control &&
        field.control.type === Field.fieldTypes.DATETIME
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get target repeating data structure from the PageGroup/List reference.
   * E.g. given 'pyWorkPage.Addresses' of type 'Group', return the Addresses object.
   * @param { String } reference - Property reference for PageGroup/List (e.g. pyWorkPage.Addresses)
   * @param { String } referenceType - Type of repeat. Group or List.
   * @param { Object } obj - Object to search for matching repeat object.
   * @return { Object / Array } Returns an object for PageGroup, array for PageList
   */
  static getRepeatFromReference(reference, referenceType, obj) {
    let propertyPathParts = reference.split(".");
    let propertyName = propertyPathParts.pop();
    let tempObj = obj;

    // Consume each piece of property reference, indexing into object
    for (let i = 0; i < propertyPathParts.length; i++) {
      let pathPart = propertyPathParts[i];

      // Do not include pyWorkPage in content
      if (pathPart === "pyWorkPage") {
        continue;
      }

      // regex to match repeating references (PageList / PageGroup)
      if (/(.*)[(].+[)]$/.test(pathPart)) {
        // Use regex to split on parens to get ref and index, use filter to remove empty string at end
        let pageListParts = pathPart.split(/[()]/).filter(Boolean);
        let pageName = pageListParts[0];
        let pageIndex = pageListParts[1];

        if (isNaN(pageIndex)) {
          // Handling page group (associative array)
          tempObj = tempObj[pageName][pageIndex];
        } else {
          // Handling page list (Pega uses 1-indexed array, convert to 0-indexed)
          pageIndex = parseInt(pageIndex, 10) - 1;
          tempObj = tempObj[pageName][pageIndex];
        }
      } else {
        // We are dealing with a non-pagegroup/list object. Index into it directly.
        tempObj = tempObj[pathPart];
      }
    }

    // Initialize repeat if not previously initialized
    // If it is a page group, it must be an object. Otherwise, array.
    if (!tempObj[propertyName]) {
      tempObj[propertyName] = referenceType === "Group" ? {} : [];
    }

    return tempObj[propertyName];
  }

  /**
   * Given array or object corresponding to repeat, get a blank entry.
   * This is to get a 'blank' entry to be appended onto array for PageList,
   * or added into the object for a PageGroup.
   * @param { Object/Array } obj - Object from which to get blank entry. Object for PageGroup, or Array for PageList.
   */
  static getBlankRowForRepeat(obj) {
    let blankRow;

    if (Array.isArray(obj)) {
      // Since we are preventing deleting the last row, it is always safe to assume there is 1 row in arr
      blankRow = Object.assign({}, obj[0]);
    } else {
      // Dealing with Page Group, use random key as model to blank out
      blankRow = Object.assign({}, obj[Object.keys(obj)[0]]);
    }

    this.setObjectValuesBlank(blankRow);
    return blankRow;
  }

  /**
   * Used to blank out all initial values for an Object.
   * Used when appending an entry onto a PageList, or adding an entry for a PageGroup.
   * @param { Object } obj - Object whose values to blank
   */
  static setObjectValuesBlank(obj) {
    let keys = Object.keys(obj);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];

      // Ecountered an array of objects, ensure its length is only 1 and blank its values
      if (Array.isArray(obj[key])) {
        obj[key].splice(1);
        this.setObjectValuesBlank(obj[key][0]);

        // Encountered an object, blank its values
      } else if (typeof obj[key] === "object") {
        this.setObjectValuesBlank(obj[key]);

        // Encountered a plain key, set it's value blank
      } else {
        obj[key] = "";
      }
    }
  }

  /**
   * Get PageGroup key given layout row.
   * To assist when constructing PageGroup grid.
   * @param { Object } row - corresponding to layout containing PageGroup
   * @return { String } String name of the PageGroup key corresponding to the layout row
   */
  static getPageGroupKeyFromRow(row) {
    for (let i = 0; i < row.groups.length; i++) {
      if (row.groups[i].field && row.groups[i].field.reference) {
        let pathParts = row.groups[i].field.reference.split(".");

        // Iterate backwards over path parts, because we want deepest pagegroup
        // To supported multi-nested PageGroups
        for (let j = pathParts.length - 1; j >= 0; j--) {
          if (/(.*)[(].+[)]$/.test(pathParts[j])) {
            // Use regex to split on parens to get ref and index, use filter to remove empty string at end
            let pageListParts = pathParts[j].split(/[()]/).filter(Boolean);

            // PageGroup keyname will always be the second part of above split on parens
            return pageListParts[1];
          }
        }
      }
    }

    return "";
  }

  /**
   * Get initial state for PegaForm, with all flat references.
   * We need all initial references on WO state so that when we add /remove a row
   * to a repeating list, we know where to append / delete.
   * This takes a view, and returns an object with all field references present.
   * @param { Object } view - View receieved from API endpoint
   * @return { Object } Object containing all initial property paths and values.
   */
  static getInitialValuesFromView(view) {
    const graph = {
      graphMap: {},
      referenceMap: {},
      idMap: {},
      fieldCount: -1
    };

    const caseData = ReferenceHelper.processView(view, {}, graph);
    return { caseData, graph };
  }

  /**
   * Process a view from layout API data
   * @param { Object } view - view object
   * @param { Object } state - object in which to collect all initial paths and values. Defaults to empty obj.
   * @return { Object } object in which all initial paths and values are collected.
   */
  static processView(view, state = {}, graph) {
    // If the view is a page (harness), then do not require an explicit visible property
    if (view.visible || view.pageID) {
      ReferenceHelper.processGroups(view.groups, state, graph);
    }

    return state;
  }

  /**
   * Process an array of groups from layout API
   * @param { Array } groups - Corresponds to Groups array of objects return from API
   * @param { Object } state - object in which all initial paths and values are collected.
   */
  static processGroups(groups, state, graph) {
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];

      if (group.view) {
        ReferenceHelper.processView(group.view, state, graph);
      }

      if (group.layout) {
        ReferenceHelper.processLayout(group.layout, state, graph);
      }

      if (group.field) {
        ReferenceHelper.processField(group.field, state, graph);
      }
    }
  }

  /**
   * Process a layout from layout API
   * @param { Object } layout - layout object
   * @param { Object } state - object in which all initial paths and values are collected.
   */
  static processLayout(layout, state, graph) {
    if (layout.rows) {
      layout.rows.forEach(row => {
        ReferenceHelper.processGroups(row.groups, state, graph);
      });
    } else if (layout.view) {
      ReferenceHelper.processView(layout.view, state, graph);
    } else {
      ReferenceHelper.processGroups(layout.groups, state, graph);
    }
  }

  static addFieldData(reference, value, state) {
    state[reference] = value;
  }

  validFields = {
    TEXTINPUT: "pxTextInput",
    DROPDOWN: "pxDropdown",
    CHECKBOX: "pxCheckbox",
    TEXTAREA: "pxTextArea",
    EMAIL: "pxEmail",
    DATETIME: "pxDateTime",
    INTEGER: "pxInteger",
    PHONE: "pxPhone",
    HIDDEN: "pxHidden",
    URL: "pxURL",
    RADIOBUTTONS: "pxRadioButtons",
    AUTOCOMPLETE: "pxAutoComplete",
    CURRENCY: "pxCurrency",
    NUMBER: "pxNumber"
  };

  static get dataFields() {
    return {
      pxTextInput: "TEXTINPUT",
      pxDropdown: "DROPDOWN",
      pxCheckbox: "CHECKBOX",
      pxTextArea: "TEXTAREA",
      pxEmail: "EMAIL",
      pxDateTime: "DATETIME",
      pxInteger: "INTEGER",
      pxPhone: "PHONE",
      pxHidden: "HIDDEN",
      pxRadioButtons: "RADIOBUTTONS",
      pxAutoComplete: "AUTOCOMPLETE",
      pxCurrency: "CURRENCY",
      pxNumber: "NUMBER"
    };
  }

  /**
   * Process a field from layout API.
   * It is at this point that an entry is added to the state object.
   * @param { Object } field - field object returns from API
   * @param { Object } state - object in which key/value entry is added for property reference.
   * this.validFields[field.control.type] &&
   */

  static processField(field, state, graph) {
    if (field.control) {
      if (field.reference && field.reference.indexOf("pyTemplate") !== -1)
        return;
      ReferenceHelper.handleDateField(field);
      if (ReferenceHelper.dataFields[field.control.type]) {
        if (
          !field.readOnly &&
          !field.disabled &&
          (field.visible || field.control.type === "pxHidden")
        ) {
          state[field.reference] = field.value;
        }
        field.index = ++graph.fieldCount;
        if (!graph.referenceMap[field.reference])
          graph.referenceMap[field.reference] = new Set();
        graph.referenceMap[field.reference].add(field.index);
        graph.graphMap[field.index] = new Set();
      }
    }
  }

  static handleDateField(field) {
    if (
      (field.value && field.control.type === "pxDateTime") ||
      (field.control.modes &&
        field.control.modes[1].formatType &&
        field.control.modes[1].formatType.match(/date/i))
    ) {
      let mode = field.control.modes[1];
      if (
        field.value &&
        (mode.dateFormat ||
          (mode.dateTimeFormat &&
            mode.dateTimeFormat.match(/DateTime-/i) &&
            field.value.length === 8))
      ) {
        field.value = field.value
          ? field.value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
          : "";
      } else if (
        mode.dateTimeFormat &&
        mode.dateTimeFormat.match(/DateTime-/i)
      ) {
        field.value = field.value
          ? field.value.replace(
              /(\d{4})(\d{2})(\d{2}T\d{2})(\d{2})(\S+)( GMT)/,
              "$1-$2-$3:$4:$5Z"
            )
          : "";
      }
    }
  }
}
