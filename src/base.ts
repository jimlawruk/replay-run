export class Base {

  // refresh() to be overridden by derived classes.
  refresh() { }

  getById(id: string): HTMLElement {
    return document.getElementById(id)!;
  }

  getButtonById(id: string): HTMLButtonElement {
    return (<HTMLButtonElement>this.getById(id));
  };

  getInputById(id: string): HTMLInputElement {
    return this.getById(id) as HTMLInputElement;
  }

  getSelectValue(id: string): string {
    return (this.getById(id) as HTMLSelectElement).value;
  }

  showOrHide(id: string, condition: boolean, display: string = 'block') {
    const style = this.getById(id).style;
    style.display = condition ? display : 'none';
  }

  addClickHandler(id: string, func: (e: any) => any) {
    this.getById(id)?.addEventListener('click', async (e: any) => {
      this.refresh();
      await func(e);
      this.refresh();
    });
  }

  getParameterByName(name: string) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }
}