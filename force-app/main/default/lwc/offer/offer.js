import { LightningElement, api } from 'lwc';

export default class Offer extends LightningElement {
    @api offer;
    @api currentIdx;
    @api index;
    @api selectHandler;

    connectedCallback() {
    }

    get showOffer() {
        return this.currentIdx === this.index;
    }

    handleClick(evt) {
        this.selectHandler(evt.target.dataset.name);
    }
}