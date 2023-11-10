import { Main } from './main'

const main = new Main();
(<any>window).main = main;
main.run();