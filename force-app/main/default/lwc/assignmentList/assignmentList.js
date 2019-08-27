import { LightningElement, track, api, wire} from 'lwc';
import { apiService } from 'c/service';
import { registerListener, unregisterAllListeners, } from 'c/pubsub';
import { CurrentPageReference } from 'lightning/navigation';

const columns = [
    { label: 'Case ID', fieldName: 'pxRefObjectInsName', initialWidth:120, sortable: true },
    { label: 'Status', fieldName: 'pyAssignmentStatus', fixedWidth: 120 },
    { label: 'Urgency', fieldName: 'pxUrgencyAssign', fixedWidth: 120 },
    { label: 'Category', fieldName: 'pyLabel' },
    { label: 'Date', fieldName: 'pxCreateDateTime', type: 'date', sortable: true, typeAttributes:{
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            } 
        }
    ];

export default class AssignmentList extends LightningElement {
    workLisyKW = "My Worklist"
    @api operator;
    @api url;
    @track assignments = [];
    @track tableLoadingState = true;
    @track currentAssignmentSource = this.workLisyKW;
    @track sortDirection = "desc";
    @track queryTerm = "";
    @track fetchTime = new Date();
    @api flexipageRegionWidth;

    @wire(CurrentPageReference) pageRef;

    sortedBy = "pxRefObjectInsName";
    columns = columns;
    assignmentSource;
    assignmentsData = [];
    currentIndex = 0;
    pageSize = 5; 

    connectedCallback() {
        if(this.operator) {
            this.setOperator(this.operator);
        }
        registerListener('workObjectCreated', this.handleRefresh, this);
        registerListener('refreshAssignments', this.handleRefresh, this);      
    }

    disconnectedCallback() {
        unregisterAllListeners(this);
    } 

    renderedCallback() {}

    @api
    setOperator(operator) {
        try {
            this.operator = operator;
            this.processAssignmentsSource();
            this.getAssignments();
        } catch (error) {
            apiService.showError(error, this);
        }
    }

    processAssignmentsSource() {
        let assignmentSource = [this.workLisyKW, ...this.operator.pyWorkbasket];
        this.assignmentSource = assignmentSource.map((option, idx) => {
        return {
                label: option,
                value: option,
                key: idx,
            }
        });
    }

    async getAssignments() {
        try {
            this.tableLoadingState = true;
            if (this.currentAssignmentSource === this.workLisyKW) this.assignmentsData = await apiService.getWorkList(this.url); 
            else this.assignmentsData = await apiService.getWorkBasket(this.url, this.currentAssignmentSource);
            this.loadData();
            this.tableLoadingState = false;
            this.fetchTime = new Date();
        } catch (error) {
            this.tableLoadingState = false;
            apiService.showError(error, this);
        }
    }

    doGetAssignments = () => {
        this.getAssignments();
    }

    handleRefresh() {
        this.currentIndex = 0;
        this.queryTerm = "";
        this.doGetAssignments();
    }
 
    handleWorkSourceChange(event) {
        try {
            this.currentIndex = 0;
            this.currentAssignmentSource = event.detail.value;
            this.queryTerm = "";
            this.getAssignments();
        } catch (error) {
            apiService.showError(error, this);
        }
    }

    handleSort(event) {
        let sortedBy = event.detail.fieldName;
        if (sortedBy === this.sortedBy) {
            this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
        }
        this.sortedBy = sortedBy;
        this.loadData();
    }

    handleKeyUp(evt) {
        this.queryTerm = evt.target.value;
        this.currentIndex = 0;
        apiService.debounce(this.loadData, 100)();
    }

    handleSearch(evt) {
        this.queryTerm = evt.target.value;
        this.currentIndex = 0;
        this.loadData();
    }    

    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        if (selectedRows.length === 0) return;
        const assignmentId = selectedRows[0].pzInsKey;
        const caseId = selectedRows[0].pxRefObjectKey;
        const selectEvent = new CustomEvent('workitemselected', {
            detail: { 
                assignmentId, 
                caseId
            }
        });
        this.dispatchEvent(selectEvent);
    }

    get assignmentsFetchTime() {
        if (!this.assignmentsData.pxResults) return "";
        let time = this.fetchTime.toLocaleTimeString().replace(/:\d{2} /, " ");
        return `${this.assignments.length} of ${this.total} assignments as of today ${time}.`;
    }   
    
    get showAssignmentSource() {
        return this.assignmentSource && this.assignmentSource.length > 1;
    }

    loadData = () => {
        let moreAssignments = this.assignmentsData.pxResults.filter(itm => itm.pxRefObjectInsName.includes(this.queryTerm));
        
        if (this.sortedBy === "pxRefObjectInsName") {
            moreAssignments.sort((x, y) => {
                const prefixX = x.pxRefObjectInsName.split("-");
                const prefixY = y.pxRefObjectInsName.split("-");
                if (prefixX[0] !== prefixY[0]) {
                    if (prefixX[0] < prefixY[0]) return -1;
                    if (prefixX[0] > prefixY[0]) return 1;
                    return 0;
                }
                return prefixX[1] - prefixY[1];
            });
        } else if (this.sortedBy === "pxCreateDateTime") {
            moreAssignments.sort((x, y) => {
                let v0 = x[this.sortedBy];
                let v1 = y[this.sortedBy];
                return new Date(v0).getTime() - new Date(v1).getTime();
            });
        }

        if (this.sortDirection === "desc") {
            moreAssignments.reverse();
        }

        this.total = moreAssignments.length;
        let lastIdx = this.pageSize * (this.currentIndex); 
        if (lastIdx < moreAssignments.length) {
            this.currentIndex++;
            lastIdx = this.pageSize * this.currentIndex;
            moreAssignments = moreAssignments.slice(0, lastIdx);
            this.assignments = moreAssignments.map(itm => {
                let pxCreateDateTime = itm.pxCreateDateTime.replace(/ GMT/, "");
                pxCreateDateTime = new Date(pxCreateDateTime);
                let x = {...itm, pxCreateDateTime};
                return x;
            });
        } else {
            this.assignments = moreAssignments;
        }
    }

    loadMoreData() {
        apiService.debounce(this.loadData, 300)();
    }

    resize(evt) {
        // debugger;
    }
}