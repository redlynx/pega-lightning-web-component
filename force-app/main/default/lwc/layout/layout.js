import { LightningElement, api } from 'lwc';
import { apiService } from 'c/service';
// import { url } from 'inspector';

export default class Layout extends LightningElement {
    @api layoutObject;
    @api registerComponent;
    @api fieldChangedHandler;
    @api fieldClickedHandler;
    @api fieldBluredHandler;
    @api getWorkObject;
    @api url;
    @api size = 12;
    
    static get layoutTypes() {
        return {
            INLINE_GRID_DOUBLE: "Inline grid double",
            INLINE_GRID_TRIPLE: "Inline grid triple",
            INLINE_GRID_70_30: "Inline grid 70 30",
            INLINE_GRID_30_70: "Inline grid 30 70",
            STACKED: "Stacked",
            GRID: "Grid",
            DYNAMIC: "Dynamic",
            INLINE_MIDDLE: "Inline middle",
            TOP: "TOP",
            DEFAULT: "Default",
            MIMIC: "Mimic a sentence"
        };
    }

    get style() {
        let height = "100";
        if (this.layoutObject && this.layoutObject.rows 
            && this.layoutObject.rows.groups && this.layoutObject.rows.groups.length > 0) {
                height = 75 + this.layoutObject.rows.groups[0].length * 26.25;
        }
        return `height: ${height}px};`;
    }    

    get tableHeight() {
        debugger
        let height = 120;
        if (this.layoutObject 
            && this.layoutObject.rows
            && this.layoutObject.rows.length > 0) {
            height = 60 + this.layoutObject.rows.length * 60;
            if (height > 360) 
                height = 345;
        }
        return `height: ${height}px;`;
    }

    get title() {
        return apiService.sanitizeHTML(this.layoutObject.title);
    }

    get keyRow() {
        return apiService.generateKey("tr");
    } 

    get keyCell() {
        return apiService.generateKey("td");
    }

    get key() {
        return apiService.generateKey("l");
    }

    get group0() {
        return this.layoutObject.groups[0];
    }

    get group1() {
        return this.layoutObject.groups[1];
    }

    get group2() {
        return this.layoutObject.groups[2];
    }

    get isStacked() {
        let supportedLayouts = new Set();
        supportedLayouts.add(Layout.layoutTypes.INLINE_GRID_DOUBLE);
        supportedLayouts.add(Layout.layoutTypes.INLINE_GRID_TRIPLE);
        supportedLayouts.add(Layout.layoutTypes.INLINE_GRID_30_70);
        supportedLayouts.add(Layout.layoutTypes.INLINE_GRID_70_30);
        supportedLayouts.add(Layout.layoutTypes.INLINE_MIDDLE);
        supportedLayouts.add(Layout.layoutTypes.GRID);
        supportedLayouts.add(Layout.layoutTypes.DYNAMIC);

        return !supportedLayouts.has(this.layoutObject.groupFormat); 
    }

    get isInlineMiddle() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.INLINE_MIDDLE;
    }

    get isDouble() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.INLINE_GRID_DOUBLE;
    }

    get isDynamic() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.DYNAMIC;
    }    

    get isTriple() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.INLINE_GRID_TRIPLE;
    }

    get is3070() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.INLINE_GRID_30_70;
    }   

    get is7030() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.INLINE_GRID_70_30;
    }    

    get isGrid() {
        return this.layoutObject.groupFormat === Layout.layoutTypes.GRID;
    } 

    @api
    reportError(reference, msg) {
        const groups = this.template.querySelectorAll("c-group");
        if (groups) {
            groups.forEach(group => {
                group.reportError(reference, msg);   
            });
        }
    }
    
    fireGridActionEvent = (evt) => {
        let action = evt.target.dataset.action;
        let referenceType = this.layoutObject.referenceType;
        let reference = this.layoutObject.reference;
        const gridEvent = new CustomEvent('listactionevent', {
            bubbles: true,
            composed:true,            
            detail: { 
                referenceType,
                reference,
                action
            }
        });
        this.dispatchEvent(gridEvent);
    }  
}