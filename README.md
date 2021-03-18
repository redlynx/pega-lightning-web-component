# Pega Lightning Web Components

## Table of Contents

- [Basic Information](#basic-information)
- [Development Environment](#development-environment)
- [Installation Instructions](#installation-instructions)
- [Basic Usage](#basic-usage)
- [Authentication with JWT Bearer Token](#authentication-with-jwt-bearer-token)
- [Application Structure](#application-structure)
- [Issues](#issues)
- [Other Resources](#other-resources)

## Basic Information

Pega Lightning Web Components are web components that run Pega cases natively inside Salesforce. They don't use iframe, external JavaScript libraries nor any CSS from Pega. They consist of the following components:

- My Assignments
- Create Case
- Create Case From Salesforce Record
- Get Next Work
- Pega Mashup Container

## Development Environment

Get a Salesforce developer account then follow [Set Up Salesforce DX](https://trailhead.salesforce.com/content/learn/modules/sfdx_app_dev/sfdx_app_dev_setup_dx). To set up your development environment, follow the instruction in Trailhead module [Quick Start: Lightning Web Components](https://trailhead.salesforce.com/content/learn/projects/quick-start-lightning-web-components).

## Installation Instructions

1.  Get `pegaLwcStarterPack84.zip` from Pega Exchange
2.  Unzip pegaLwcStarterPack84.zip, that will create pegaLwcStarterPack84 directory that contains the following sub-directories: cableConnectApp, documents and pegaLwcApp

```
cd ./pegaLwcStarterPack84/pegaLwcApp
```

3. Extract pega-lwc.zip file and go to pega-lwc directory  
   `cd pega-lwc`
4. Authenticate with your hub org

```
sfdx force:auth:web:login -d -a myhuborg
```

5. Configure remote sites and trusted sites settings:

- Change the endpointUrl in `./force-app/main/default/cspTrustedSites/Pega_Server.cspTrustedSite-meta.xml` to point to your Pega server

```
<endpointUrl>https://your_pega_server</endpointUrl>
```

- Change the endpointUrl in `./force-app/main/default/remoteSiteSettings/Pega_Server.remoteSite-meta.xml` to point to your Pega server

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

9. Open the App Launcher and click Sales
10. Click the gear in the upper right hand corner and select Edit Page
11. Drag `My Assignments` Lightning web component from the list of Custom Components to the top of the page canvas
12. Configure my-assignments component:

- urls: `https://my-pega-server/prweb/api/v1/`
- authentication: Basic
- user: rep.cableco or your_pega_operator_id
- password: pega or your_pega_password
- Ensure that your access group includes the PegaRULES:PegaAPI role.
- Make sure that your application server supports CORS, check your application server CORS configuration if your system is not working correctly.

13. Click Save.
14. Click Activate.
15. Click Assign as Org Default.
16. Click Save
17. Click Save again, then click Back to return to the Home page

> WARNING: Basic authentication stores the password in the browser. It is provided for demo purpose only and it should never be used in production. For a secure authentication, use OAuth 2.0 JWT Bearer Token.
>
> Optional: follow [Salesforce instructions](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_build_man_pack.htm) to package the application.

## Basic Usage

To use the Cable Connect sample application, you can use any of the following credentials:

- operator: rep.cableco, password: pega - case worker
- operator: tech.cableco, password: pega – case worker
- operator: manager.cableco, password: pega – case manager
- operator: admin.cableco, password: pega – developer/admin

Once configured, you can create cases using `Create Case` component, perform assignments using `My Assignments` component or get your next work using `Get Next Work` component.

## Authentication with JWT Bearer Token

To configure JWT Bearer Token authentication in Pega, follow these steps:

- Generate a RSA key pair and a keystore
- Create a Keystore rule and upload the keystore from the previous step
- Create an OAuth 2.0 Client Registration rule:
  - Enable JWT Bearer
- Create an Identity Mapping rule
- Create a Token Processing Profile rule

To configure JWT Bearer Token authentication in Salesforce, follow these steps:

- Go to Setup -> Certificate and Key Management
- Import the keystore from the step above into Salesforce
- Go to Setup -> Custom Code -> Custom Metadata Types
- Create a new `JWT Settings` record:
  - ID: DX-API base endpoint e.g. https://my_server/prweb/api/v1/
  - Issuer: OAuth Client ID
  - Client Secret: OAuth Client Secret
  - Certificate Name: Salesforce certificate name
  - Audience: OAuth token endpoint e.g. https://my_server/prweb/PRRestService/oauth2/v1/token

> Note: Authentication with JWT Bearer Token assumes that Pega operator ID is the same as Salesforce user email

## Application Structure

```
pegaLwc
  config
  force-app
    main
      default
        aura
        classes
        cspTrustedSites
        layouts
        lwc
          assignmentList
          caseContainer
          createWork
          createWorkFromRecord
          field
          getNextWork
          group
          layout
          mashup
          modal
          modalDialog
          myAssignments
          pubsub
          referenceHelper
          service
          view
        objects
        remoteSiteSettings
```

Some of the components are highlighted below:

### `force-app⁩/main⁩/default⁩/lwc⁩/myAssignments`

Lightning web component to access Pega worklist and workbaskets.

Features:

- Federated worklist and workbaskets
- Sort by any column based on it's data type
- Search by any columns including dates
- Dynamically add, remove or change the order or columns including custom columns
- Save settings to browser local storage
- Configurable worklist and workbasket data source
- Configurable worklist and workbasket headers
- Infinite scrolling

Parameters:

- DX-API endpoint: comma separated list of DX-APIs base endpoints
- Authentication type: Basic or JWT Bearer.
- Operator ID: Pega operator ID, used for Basic authentication.
- Operator password: Pega operator password, used for Basic authentication.
- Worklist datapage: the data page to retrieve worklist assignments, defaults to `D_pyMyWorkList`
- Default worklist columns: a comma separated list of columns to display, defaults to `pxRefObjectInsName, pyAssignmentStatus, pxUrgencyAssign, pyLabel, pxCreateDateTime, pxTaskLabel`
- Workbasket datapage: the data page to retrieve workbaskets assignments, defaults to `D_WorkBasket`

> The component supports getting assignments from multiple Pega instances.

### `force-app⁩/main⁩/default⁩/lwc⁩/createWork`

Lightning web component to create Pega cases.

Parameters:

- DX-API endpoint: comma separated list of DX-APIs base endpoints
- Authentication type: Basic or JWT Bearer.
- Operator ID: Pega operator ID, used for Basic authentication.
- Operator password: Pega operator password, used for Basic authentication.
- Flows: comma separated list of flows to display

> This component supports creating cases from multiple Pega instances.

### `force-app⁩/main⁩/default⁩/lwc⁩/createWorkFromRecord`

Lightning web component to create Pega cases from Salesforce records. By default, the component associates the Salesforce record with Pega case using Salesforce CaseId\_\_c field and associates Pega case with Salesforce record using RecordId case property. The component also converts Salesforce record into JSON and use it to populate the RecordJsonData case property. Pega developers can use that JSON to populate other case properties. To use createWorkFromRecord component:

- Create CaseId text field in Salesforce object.
- Create RecordId and RecordJsonData text properties in Pega case.
- Create an activity that parses RecordJsonData and add it to your flow.

Parameters:

- DX-API endpoint: comma separated list of DX-APIs base endpoints
- Authentication type: Basic or JWT Bearer.
- Operator ID: Pega operator ID, used for Basic authentication.
- Operator password: Pega operator password, used for Basic authentication.
- Flows: comma separated list of flows to display
- Mode:
  _ Review: display the review harness.
  _ Create and Review: create a case then display the review harness along with any assignments for the new case.

> See O1SPYR-DigExp-Work-CaseFromRecord for an example case.
>
> This component can only be used inside Salesforce records (Account, Opportunity...)
>
> Make sure that the max length of RecordJsonData property is enough to hold Salesforce record data, 2K should be a good start.

### `force-app⁩/main⁩/default⁩/lwc⁩/getNextWork`

Lightning web component to get Pega operator next assignment. Parameters:

- DX-API endpoint: comma separated list of DX-APIs base endpoints
- Authentication type: Basic or JWT Bearer.
- Operator ID: Pega operator ID, used for Basic authentication.
- Operator password: Pega operator password, used for Basic authentication.

### `force-app⁩/main⁩/default⁩/lwc⁩/mashup`

Lightning web component to enable using Pega Mashups without the need for Visualforce Pages. It depends on the existence of single sign-on configuration.

Parameters:

- Mashup URL: Pega Mashup iframe URL with the appropriate SSO authentication servlet configured.
- Mashup height (in pixels)

### `force-app⁩/main⁩/default⁩/lwc⁩/service`

Shared Javascript module to make AJAX requests, manage responses and provide utility functions.

### `force-app⁩/main⁩/default⁩/lwc⁩/caseContainer`

- Lightning web component used to generate forms for Pega assignments, views, and pages based on data returned from the Pega API.

Form generation for assignments, views, and pages are all based on a nested UI data structure returned from the API. When changing values on the form (checking a checkbox, typing into an input, etc...) the changes in value are reflected in caseData for caseContainer. When doing a POST to submit an assignment or refresh fields, the caseData object is translated into a nested representation of the data based on page structure, and posted to Pega server.

- Views/pages contain groups.
- Each element of a Group array can contain a view, layout, field, or paragraph.
- Layouts determine the UI structure of the form. Supported layout are:
  - Stacked
  - Grid
  - Repeating Dynamic Layout
  - Inline middle
  - Inline grid double
  - Inline grid double (70 30)
  - Inline grid double (30 70)

### `force-app⁩/main⁩/default⁩/lwc⁩/field`

- Fields contain information about the property, including reference, current value, validation messages, and attached actions.
- Supported fields:
  - pxTextInput
  - pxDropdown
  - pxCheckbox
  - pxTextArea
  - pxURL
  - pxEmail
  - pxDateTime
  - pxInteger
  - pxPhone
  - pxDisplayText
  - pxHidden
  - pxButton
  - pxLink
  - pxIcon
  - pxRadioButtons
  - pxCurrency
  - pxAutoComplete
- Supported actions:
  - setValue
  - postValue
  - refresh
  - runScript
  - openUrlInWindow
- PageGroups and PageLists are supported.

Supported icon surces:
  styleclass
  standardIcon
  
Suported icons and icons mapping:
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
    plus: "utility:add",
    minus: "utility:minimize_window",
    case: "utility:case",
    home: "utility:home",
    search: "utility:search",
    "arrow-right": "utility:chevronright",
    reset: "utility:undo",
    pencil: "utility:edit",
    gear: "utility:setting",
    trash: "utility:trash",
    information: "utility:info",
    help: "utility:help",
    warn: "utility:warning"


### `force-app⁩/main⁩/default⁩/lwc⁩/referenceHelper`

- Shared Javascript module to handle translating Pega's fully qualified property paths to a nested JSON Object structure, and vice versa.
- Also some utility methods for:
  - Handling initial PegaForm state given View from API
  - Finding correct PageGroup/List based on property reference
  - Getting blank entry for PageGroup/List when adding new element
- When posting data to the server via API, it must be nested.
- When retrieving field information from the server, the property paths are flat and qualified.

## Notes

- All components are based on v1 Pega DX-API.
- Compatible with Pega 8.4 and up.

## Issues

- Resizing the browser window to a smaller size doesn't resize the worklist

## Other Resources

- https://developer.salesforce.com/docs/component-library/documentation/lwc
