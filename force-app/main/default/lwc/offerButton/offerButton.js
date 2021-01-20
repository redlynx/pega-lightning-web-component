import { LightningElement, api } from 'lwc';

export default class OfferButton extends LightningElement {
    @api currentIdx;
    @api index;

    connectedCallback() {
    }
    
    get buttonClassName() {
        return this.index === this.currentIdx ? "slds-carousel__indicator-action slds-is-active" : "slds-carousel__indicator-action";
    }

    handleClick() {
        const selectoffer = new CustomEvent('selectoffer', {
            detail: { 
                index: this.index
            }
        });
        this.dispatchEvent(selectoffer);
    }

    get key() {
        return "b_" + this.index;
    }
}