import { LightningElement, track, api } from 'lwc';
 
export default class ModalDialog extends LightningElement {
    @track bShowModal = false;
    @track viewObject;

    @api 
    setView(view) {
        this.viewObject = view;
    }

    @api
    openModal() {    
        debugger
        this.bShowModal = true;
    }
    
    @api
    closeModal() {    
        this.bShowModal = false;
    }
}