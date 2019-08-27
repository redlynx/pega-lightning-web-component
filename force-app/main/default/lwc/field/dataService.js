import Field from './field'
import { apiService } from 'c/service'

export const dataService = {
  setDropdownOptions
}

function setDropdownOptions(url, fieldObject, workObject, component, setOptions) {
  let options = [];
  if (!fieldObject || !fieldObject.control 
      || !fieldObject.control.modes || fieldObject.control.modes.length === 0) 
      setOptions(options);
  let mode = fieldObject.control.modes[0];
  if (mode && mode.listSource === Field.sourceTypes.DATAPAGE) {
      dropdownOptionsFromDataPage(url, mode, component, setOptions);
  } else if (mode && mode.listSource === Field.sourceTypes.PAGELIST) {
    optionsFromPageList(fieldObject, workObject, setOptions);
  } else if (mode && mode.listSource === Field.sourceTypes.LOCAL_LIST && mode.options) {
    optionsFromLocalList(mode, setOptions);
  }
}

async function dropdownOptionsFromDataPage(url, mode, component, setOptions) {
  try {
    let pageId = mode.dataPageID;
    let propertyName = mode.dataPageValue;
    let propertyPrompt = mode.dataPagePrompt;
    let pageParams = {};
    let data = await apiService.getDataPage(url, pageId, pageParams);
    let options = convertDataPageToOptions(data, propertyName, propertyPrompt);
    setOptions(options);
  } catch (error) {
    apiService.showError(error, component);
    setOptions([{ label: error, value: error }]);
  }
}

function convertDataPageToOptions(dataPage, propertyName, propertyPrompt) {
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

function optionsFromPageList(fieldObject, workObject, setOptions) {
  let pageId = fieldObject.control.modes[0].clipboardPageID;
  let clipboardPagePrompt = fieldObject.control.modes[0].clipboardPagePrompt;
  let clipboardPageValue = fieldObject.control.modes[0].clipboardPageValue;
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

function optionsFromLocalList(mode, setOptions) {
  let options = mode.options.map(option => {
    return {
      label: option.key,
      value: option.value
    };
  });
  setOptions(options);
}