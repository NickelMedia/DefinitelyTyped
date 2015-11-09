declare module "classlist" {}
declare module "wheel" {}
declare module "Object-watch-polyfill" {}
declare module "history.js" {}
declare module "gsap" {}
declare var TEMPLATE_DATA:any;
declare module "google-maps" {
    var KEY:string;
    var CLIENT:string;
    var VERSION:string;
    var SENSOR:boolean;
    var LIBRARIES:string[];
    var LANGUAGE:string;
    function load():void;
    function release():void;
    function onLoad():void;
}