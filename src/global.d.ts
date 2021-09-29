/// <reference types="@sveltejs/kit" />


type TId = string;

type TCSSStylesCollection = { [property: string]: string };

interface IPoint {
    x: number;
    y: number;
}

interface ISize {
    width: number;
    height: number;
}

interface IRectangle extends IPoint, ISize {}

