# Pega Lightning Web Components (PLWCs)


## Table of Contents

* [Basic Information](#basic-information)
* [Development Environment](#development-environment)
* [Installation Instructions](#installation-instructions)
* [Basic Usage](#basic-usage)
* [Authentication with JWT Bearer Token](#authentication-with-jwt-bearer-token)
* [Application Structure](#application-structure)
* [Issues](#issues)
* [Other Resources](#other-resources)

## Basic Information

Pega Lightning Web Components are web components that run Pega cases natively inside Salesforce. They don't use iframe, any JavaScript external libraries nor any CSS from Pega. They consist of the following four components: 
* my-assignments
* create-work
* get-next-work
* opportunity-demo

## Development Environment

Get a Salesforce developer account then set up your Salesforce DX: `https://trailhead.salesforce.com/content/learn/modules/sfdx_app_dev/sfdx_app_dev_setup_dx`. Make sure that you have enabled Dev Hub. Follow the instruction in Trailhead module Quick Start: Lightning Web Components `https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components` to set up your  DX environment. Make sure that you have enabled Dev Hub.

## Installation Instructions

1.  Get `PegaLwcStarterPack82.zip` from Pega Exchange  
2. Unzip PegaLwcStarterPack82.zip, that will create PegaLwcStarterPack82 directory that contains the following sub-directories: CableConnectApp, Documents and PegaLwcApp  
  ```
  cd ./PegaLwcStarterPack82/PegaLwcApp
  ```
3. Extract pega-lwc.zip file and go to pega-lwc directory  
  ```
  cd pega-lwc
  ```
4. Authenticate with your hub org  
  ```
  sfdx force:auth:web:login -d -a myhuborg
  ```
5. Configure remote sites and trusted sites settings:  
  * Change the endpointUrl in `./force-app/main/default/cspTrustedSites/Pega_Server.cspTrustedSite-meta.xml` to point to your Pega server  
  ```
  <endpointUrl>https://your_pega_server</endpointUrl>
  ``` 
  * Change the endpointUrl in `./force-app/main/default/remoteSiteSettings/Pega_Server.remoteSite-meta.xml` to point to your Pega server
  ```
  <url>https://your_pega_server</url>
  ```  
6. Create a scratch org  
  ```
  sfdx force:org:create -s -f config/project-scratch-def.json -a pega-lwc
  ```
7. Push pega-lwc app to your scratch org:  
  ```
  sfdx force:source:push
  ```
8. Open the scratch org:  
  ```
  sfdx force:org:open
  ```
9. Open the App Launcher and click Sales  
10. Click the gear in the upper right hand corner and select Edit Page  
11. Drag my-assignments Lightning web component from the list of Custom Components to the top of the page canvas  
12. Configure my-assignments component:  
  * URL: `https://my-pega-server/prweb/api/v1/`  
  * Authentication: Basic  
  * User: rep.cableco or your_pega_operator_id  
  * Password: pega or your_pega_password  
  * Ensure that your access group includes the PegaRULES:PegaAPI role.  
  * Make sure that your application server supports CORS, check your application server CORS configuration if your system is not working correctly.  
  * WARNING: this configuration uses basic authentication and it stores the password in the browser. This configuration is for demo purpose only and it should NOT be used in production. For more secure authentication you can use OAuth 2.0 JWT Bearer Token Flow.  
13. Click Save.  
14. Click Activate.  
15. Click Assign as Org Default.  
16. Click Save  
17. Click Save again, then click Back to return to the Home page  
18. Refresh the page to view my-assignments component.  
19. Enable Salesforce Change Data Capture for Salesforce Opportunity entity to be able to use opportunity-demo component  

Optional: follow Salesforce instructions: https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_build_man_pack.htm to package the application.

## Basic Usage

To login to Cable Connect sample application, you can use any of the following credentials:  
* operator: rep.cableco, password: pega - case worker  
* operator: tech.cableco, password: pega – case worker  
* operator: manager.cableco, password: pega – case manager  
* operator: admin.cableco, password: pega – developer/admin  
  
Once logged in, you can create cases from the CaseType list, open WorkObjects from the WorkList, and perform end-to-end flows, based on the data returned from the API.  

## Authentication with JWT Bearer Token

To configure JWT Bearer Token authentication in Pega, follow these steps:  
  * Generate a RSA key pair and a keystore  
  * Create a Keystore rule and upload the keystore from the previous step  
  * Create an OAuth 2.0 Client Registration rule:  
    * Enable JWT Bearer  
  * Create an Identity Mapping rule  
  * Create a Token Processing Profile rule  
  
To configure JWT Bearer Token authentication in Salesforce, follow these steps:  
  * Go to Setup -> Certificate and Key Management
  * Import the keystore from the step above into Salesforce  
  * Go to Setup -> Custom Metadata Types
  * Open JWT Settings and click records
  * Add a new record and complete the following fields
  ```
    * Label
    * JWT Settings Name
    * Audience: Access token endpoint from your OAuth Client Registration e.g. https://your_pega_server/prweb/PRRestService/oauth2/v1/token
    * pega_sfdc: certificate name from the step above
    * Client Secret: Client Secret from OAuth 2.0 Client Registration
    * ID: Pega URL used to configure the component (from step 12 above)
    * Issuer: Client ID from OAuth 2.0 Client Registration
  ```  
## Application Structure

This project was created using SFDX: Create Project, Web Components were created using SFDX: Create Lightning Web Component  

```
pegaLwc/
  config/
    project-scratch-def.json
  force-app/
    main/
      default/
        aura/
        classes/
          PegaJwtUtil.cls
          PegaJwtUtil.cls-meta.xml
        cspTrustedSites/
          Pega_Server.cspTrustedSite-meta.xml
        lwc/
          assignmentList/
            assignmentList.css
            assignmentList.html
            assignmentList.js
            assignmentList.js-meta.xml
          caseContainer/
            caseContainer.js-meta.xml
            confirm.html
            caseContainer.js
            new.html
            perform.html
          createWork/
            createWork.css
            createWork.html
            createWork.js
            createWork.js-meta.xml
            createWork.svg
          field/
            autocomplete.css
            dataService.js
            field.html
            hidden.html
            link.html
            extInput.html
            autocomplete.html
            dateTime.html
            field.js
            icon.css
            paragraph.html
            button.html 
            displayText.html
            field.js-meta.xml
            icon.html
            radiogroup.html
            checkbox.html
            dropdown.html
            fieldData.js
            label.html
            textArea.html
          getNextWork/
            getNextWork.css
            getNextWork.html
            getNextWork.js
            getNextWork.js-meta.xml
            getNextWork.svg
          group/
            group.html
            group.js
            group.js-meta.xml
          layout/
            layout.css
            layout.html
            layout.js
            layout.js-meta.xml
          modalDialog/
            modalDialog.html
            modalDialog.js
            modalDialog.js-meta.xml
          myAssignments/
            myAssignments.html
            myAssignments.js
            myAssignments.js-meta.xml
            myAssignments.svg
          opportunityDemo/
            opportunityDemo.css
            opportunityDemo.html
            opportunityDemo.js
            opportunityDemo.js-meta.xml
            opportunityDemo.svg
          pubsub/
            pubsub.js
            pubsub.js-meta.xml
          referenceHelper/
            referenceHelper.js
            referenceHelper.js-meta.xml
          service/
            service.js
            service.js-meta.xml
          view/
            view.html
            view.js
            view.js-meta.xml
          jsconfig.json
        remoteSiteSettings/
          Pega_Server.remoteSite-meta.xml
  README.md
  sfdx-project.json

```

Some of the directories are highlighted below:

### `force-app⁩/main⁩/default⁩/lwc⁩/createWork`

Lightning web component to create Pega cases.

### `force-app⁩/main⁩/default⁩/lwc⁩/getNextWork`

Lightning web component to get next assignment.

### `force-app⁩/main⁩/default⁩/lwc⁩/myAssignments`

Lightning web component to access Pega work list and baskets.

### `force-app⁩/main⁩/default⁩/lwc⁩/opportunityDemo`

Lightning Web Component to demonstrate client-side integration between Salesforce and Pega.
  * Create a Pega case using opportunity data
  * Populate Salesforce opportunity with Pega case ID
  * Changing the opportunity amount in Pega is instantly reflected in Salesforce
  * Listen to Salesforce Change Data Capture events, displays a message in Pega when the opportunity name changes in Salesforce

### `force-app⁩/main⁩/default⁩/lwc⁩/service`

Shared Javascript module to make AJAX requests, manage responses and provide utility functions.

### `force-app⁩/main⁩/default⁩/lwc⁩/caseContainer`

* Lightning web component used to generate forms for Pega assignments, views, and pages based on data returned from the Pega API.

Form generation for assignments, views, and pages are all based on a nested UI data structure returned from the API. When changing values on the form (checking a checkbox, typing into an input, etc...) the changes in value are reflected in caseData for caseContainer. When doing a POST to submit an assignment or refresh fields, the caseData object is translated into a nested representation of the data based on page structure, and sent to the server.

* Views/pages contain groups.
* Each element of a Group array can contain a view, layout, field, or paragraph.
* Layouts determine the UI structure of the form. Supported layout groupFormats are:
  * Stacked
  * Grid
  * Repeating Dynamic Layout
  * Inline middle
  * Inline grid double
  * Inline grid double (70 30)
  * Inline grid double (30 70)

### `force-app⁩/main⁩/default⁩/lwc⁩/field`

* Fields contain information about the property, including reference, current value, validation messages, and attached actions.
* Supported fields:
  * pxTextInput
  * pxDropdown
  * pxCheckbox
  * pxTextArea
  * pxURL
  * repeating
  * pxEmail
  * pxDateTime
  * pxInteger
  * pxPhone
  * pxDisplayText
  * pxHidden
  * pxButton
  * label
  * pxLink
  * pxIcon
  * pxRadioButtons
  * pxCurrency
  * pxAutoComplete
* Supported actions:
  * setValue
  * postValue
  * refresh
  * takeAction
  * runScript
  * openUrlInWindow
* PageGroups and PageLists are also supported.

### `force-app⁩/main⁩/default⁩/lwc⁩/referenceHelper`

* Shared Javascript module to handle translating Pega's fully qualified property paths to a nested JSON Object structure, and vice versa.
* Also some utility methods for:
  * Handling initial PegaForm state given View from API
  * Finding correct PageGroup/List based on property reference
  * Getting blank entry for PageGroup/List when adding new element
* When posting data to the server via API, it must be nested.
* When retrieving field information from the server, the property paths are flat and qualified.

## Issues

* Resizing the browser window to a smallet size doesn't resize the worklist  

## Other Resources
  * https://developer.salesforce.com/docs/component-library/documentation/lwc