import { ShowToastEvent } from "lightning/platformShowToastEvent";
import generateJWT from "@salesforce/apex/PegaJwtUtil.generateJWT";

const systemsMap = {};

export const apiService = {
	createCase,
	getDataPage,
	getAssignment,
	getNextAssignment,
	getFieldsForAssignment,
	getCaseTypeDetails,
	getView,
	getPage,
	getCaseTypes,
	getOperator,
	getWorkBasket,
	getWorkList,
	getCase,
	performAction,
	performRefreshOnAssignment,
	showError,
	showErrorMessage,
	updateCase,
	showMessage,
	debounce,
	generateKey,
	decodeHTML,
	clear,
	isInitialized,
	initComponent,
	initComponentLocal,
	attachFile,
	logError
};

let endpoints = {
	BASEURL: "",
	AUTH: "authenticate",
	CASES: "cases",
	CASETYPES: "casetypes",
	VIEWS: "views",
	ASSIGNMENTS: "assignments",
	ACTIONS: "actions",
	PAGES: "pages",
	DATA: "data",
	REFRESH: "refresh"
};

let genericErrorMsg =
	"An error occured, please contact your system administrator";

function isInitialized(url) {
	return systemsMap[url] && systemsMap[url].authHeader;
}

function init(url, auth, user, password) {
	if (!url || !auth) return Promise.resolve();

	if (!systemsMap[url]) {
		systemsMap[url] = {};
	}

	if (auth === "Basic") {
		systemsMap[url].authHeader = "Basic " + btoa(user + ":" + password);
		return Promise.resolve();
	}

	if (!systemsMap[url].accessTokenPromise) {
		systemsMap[url].accessTokenPromise = generateAccessToken(url, user);
		systemsMap[url].interval = setInterval(
			() => generateAccessToken(url, user),
			3500000
		);
	} else {
		systemsMap[url].accessTokenPromise = systemsMap[
			url
		].accessTokenPromise.then(() => Promise.resolve());
	}
	return systemsMap[url].accessTokenPromise;
}

async function initComponentLocal(component) {
	component.urls = "https://lab5429.lab.pega.com/prweb/api/v1/";
	component.user = "admin.cableco";
	component.email = "admin.cableco";
	component.authentication = "Basic";
	component.password = "pega";
	component.endpoints = component.urls.split(/\s*,\s*/);
	await initComponent(component);
}

async function initComponent(component) {
	if (component.authentication === "Basic") {
		if (component.user && component.password) component.email = component.user;
		else return false;
	}
	if (!component.email || !(component.url || component.urls))
		showError("Invalid component configuration", component);

	if (component.urls) {
		component.endpoints = component.urls.split(/\s*,\s*/);
		const promiseList = component.endpoints.map(itm => init(
			itm,
			component.authentication,
			component.email,
			component.password
		));

		const results = await Promise.allSettled(promiseList);
		component.state.operator = await apiService.getDataPage(
			component.endpoints[0],
			"D_OperatorID"
		);

		let componentHasErrors = false;
		results.forEach(itm => {
			if (itm.status === "rejected") componentHasErrors = true
		});

		if (componentHasErrors) {
			showErrorMessage(genericErrorMsg, component);
		}

		// for (let i = 0; i < component.endpoints.length; i++) {
		//   try {
		//     await init(
		//       component.endpoints[i],
		//       component.authentication,
		//       component.email,
		//       component.password
		//     );
		//     if (i === 0)
		//       component.state.operator = await apiService.getDataPage(
		//         component.endpoints[0],
		//         "D_OperatorID"
		//       );
		//   } catch (err) {
		//     showErrorMessage(genericErrorMsg, component);
		//   }
		// }
	} else {
		await init(
			component.url,
			component.authentication,
			component.email,
			component.password
		);
		component.state.operator = await apiService.getDataPage(
			component.url,
			"D_OperatorID"
		);
	}
	return true;
}

function clear(url) {
	if (systemsMap[url] && systemsMap[url].interval) {
		clearInterval(systemsMap[url].interval);
		// systemsMap[url].interval = undefined;
		// systemsMap[url].accessTokenPromise = undefined;
	}
}

function generateAccessToken(url, sub) {
	return generateJWT({ sub, url })
		.then(accessToken => {
			systemsMap[url].authHeader = "Bearer " + accessToken;
			return accessToken;
		}).catch(err => {
			logError(err);
		});
}

function generateKey(prefix = "k") {
	return `${prefix}_${Math.random()
		.toString(36)
		.substr(2, 9)}`;
}

function decodeHTML(value) {
	if (value) {
		if (value.indexOf("&") !== -1) {
			const doc = new DOMParser().parseFromString(value, "text/html");
			return doc.documentElement.textContent;
		}
	}
	return value;
}

function showErrorMessage(msg, component, mode = {}) {
	let evt = new ShowToastEvent({
		title: "Error",
		message: msg,
		variant: "error",
		mode: "sticky",
		...mode
	});
	component.dispatchEvent(evt);
}

function showError(err, component, mode = {}) {
	let evt;
	if (typeof err === "string") {
		evt = new ShowToastEvent({
			title: "Error",
			message: err,
			variant: "error",
			mode: "sticky",
			...mode
		});
	} else if (!err || !err.errors || err.errors.length === 0) {
		evt = new ShowToastEvent({
			title: "Error",
			message: genericErrorMsg,
			variant: "error",
			mode: "sticky",
			...mode
		});
	} else {
		evt = new ShowToastEvent({
			title: `Error, ID: ${err.errors[0].ID}`,
			message: err.errors[0].message,
			variant: "error",
			mode: "sticky",
			...mode
		});
	}
	component.dispatchEvent(evt);
}

function debounce(func, wait, immediate) {
	var timeout;
	return function executedFunction() {
		var context = this;
		var args = arguments;

		var later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

function getWorkList(url, dataPage = "D_Worklist") {
	return getDataPage(url, dataPage, { Work: true });
}

function showMessage(
	title,
	message,
	component,
	variant = "success",
	mode = "dismissable"
) {
	let evt = new ShowToastEvent({
		title,
		message,
		variant,
		mode
	});
	component.dispatchEvent(evt);
}

function getWorkBasket(url, WorkBasket, dataPage = "D_WorkBasket") {
	if (!WorkBasket) return {};
	return getDataPage(url, dataPage, { WorkBasket });
}

function getUrlParams(params = {}) {
	let urlParams = "";
	// eslint-disable-next-line guard-for-in
	for (let p in params) {
		urlParams += `${p}=${params[p]}&`;
	}
	return urlParams ? "?" + urlParams : urlParams;
}

function getDataPage(url, id, params = {}) {
	let endpoint = url + endpoints.DATA + "/" + id;
	url = endpoint;
	let urlParams = getUrlParams(params);

	url = endpoint + urlParams;
	return makeRequest(url, "GET");
}

function getCaseTypes(url) {
	let endpoint = url + endpoints.CASETYPES;
	return makeRequest(endpoint, "GET");
}

function createCase(url, body) {
	let endpoint = url + endpoints.CASES;
	return makeRequest(endpoint, "POST", body);
}

function getCaseTypeDetails(url, id) {
	let endpoint = url + endpoints.CASETYPES + "/" + id;
	return makeRequest(endpoint, "GET");
}

function getCase(url, id) {
	let endpoint = url + endpoints.CASES + "/" + id;
	return makeRequest(endpoint, "GET");
}

function getNextAssignment(url) {
	let endpoint = encodeURI(url + endpoints.ASSIGNMENTS + "/next");
	return makeRequest(endpoint, "GET");
}

function getAssignment(url, id) {
	let endpoint = encodeURI(url + endpoints.ASSIGNMENTS + "/" + id);
	return makeRequest(endpoint, "GET");
}

function performAction(url, id, actionID, body) {
	let endpoint = encodeURI(
		url + endpoints.ASSIGNMENTS + "/" + id + `?actionID=${actionID}`
	);
	return makeRequest(endpoint, "POST", body);
}

function performRefreshOnAssignment(url, id, actionID, body) {
	let refreshFor = "";
	if (body && body.refreshFor) {
		refreshFor = `?refreshFor=${body.refreshFor}`;
		delete body.refreshFor;
	}

	let endpoint = encodeURI(
		url +
		endpoints.ASSIGNMENTS +
		"/" +
		id +
		"/" +
		endpoints.ACTIONS +
		"/" +
		actionID +
		"/" +
		endpoints.REFRESH +
		refreshFor
	);
	return makeRequest(endpoint, "PUT", body);
}

function updateCase(url, id, body, etag) {
	let endpoint = url + endpoints.CASES + "/" + id;
	return makeRequest(endpoint, "PUT", body, etag);
}

function getFieldsForAssignment(url, assignmentId, actionId) {
	let endpoint =
		url +
		endpoints.ASSIGNMENTS +
		"/" +
		assignmentId +
		"/" +
		endpoints.ACTIONS +
		"/" +
		actionId;

	return makeRequest(endpoint, "GET");
}

function getView(url, caseId, viewId) {
	let endpoint =
		url + endpoints.CASES + "/" + caseId + "/" + endpoints.VIEWS + "/" + viewId;
	return makeRequest(endpoint, "GET");
}

function getPage(url, caseId, pageId) {
	let endpoint =
		url + endpoints.CASES + "/" + caseId + "/" + endpoints.PAGES + "/" + pageId;
	return makeRequest(endpoint, "GET");
}

function getOperator(url) {
	return getDataPage(url, "D_OperatorID");
}

function logError(error) {
	console.log(error);
}

async function attachFile(url, caseId, file) {
	let endpoint = `${url}attachments/upload`;
	let body = new FormData();
	body.append("context", caseId);
	body.append("content", file);	
	const responseData = await makeRequest(endpoint, "POST", body, null, true);
	const { ID } = responseData;
	if (ID) {
		body = {
			"attachments": [
				{
					"type": "File",
					"category": "File",
					"name": file.name,
					ID,
				}
			]
		};
		endpoint = `${url}cases/${caseId}/attachments`
		const result = await makeRequest(endpoint, "POST", body);
		return result;
	}
	return Promise.reject("Couldn't attach file");
}

async function makeRequest(endpoint, method, data, etag, formDataFlag) {
	const key = endpoint.match(/.*\/api\/v[^/]*\//)[0];
	const config = {
		method: method,
		redirect: "follow",
		headers: {
			authorization: systemsMap[key].authHeader
		},
		credentials: "same-origin"
	};
	if (method === "POST" || method === "PUT") {		
		if (formDataFlag) {
			config.body = data;
		} else {
			config.headers["Content-Type"] = "application/json";
			config.body = JSON.stringify(data);
		}
	}
	if (etag) {
		config.headers["If-Match"] = etag;
	}
	try {
		const res = await fetch(endpoint, config);
		if (res.status >= 200 && res.status < 300) {
			if (res.status !== 204) {
				if (res.headers && res.headers.get("etag")) {
					const responseData = await res.json();
					responseData.etag = res.headers.get("etag");
					return responseData;
				}
				return res.json();
			}
			return res.text();
		}
		const err = await res.json();
		return Promise.reject(err);
	} catch (err) {
		return Promise.reject(err);
	}
}
