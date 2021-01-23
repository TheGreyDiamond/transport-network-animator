import { NetworkAdapter, Network, StationProvider } from "../Network";
import { TimedDrawable, BoundingBox } from "../Drawable";
import { Vector } from "../Vector";
import { Rotation } from "../Rotation";
import { Station } from "../Station";
import { Line } from "../Line";
import { SvgLine } from "./SvgLine";
import { SvgStation } from "./SvgStation";
import { Label } from "../Label";
import { SvgLabel } from "./SvgLabel";
import { GenericTimedDrawable } from "../GenericTimedDrawable";
import { SvgGenericTimedDrawable } from "./SvgGenericTimedDrawable";

export class SvgNetwork implements NetworkAdapter {

    static FPS = 60;
    static SVGNS = "http://www.w3.org/2000/svg";

    private currentZoomCenter: Vector = Vector.NULL;
    private currentZoomScale: number = 1;

    get canvasSize(): BoundingBox {
        const svg = document.querySelector('svg');
        const box = svg?.viewBox.baseVal;
        if (box) {
            return new BoundingBox(new Vector(box.x, box.y), new Vector(box.x+box.width, box.y+box.height));
        }
        return new BoundingBox(Vector.NULL, Vector.NULL);        
    }

    get beckStyle(): boolean {
        const svg = document.querySelector('svg');
        return svg?.dataset.beckStyle != 'false';
    }

    initialize(network: Network): void {
        let elements = document.getElementById('elements')?.children;
        if (elements == undefined)
        {
            console.error('Please define the "elements" group.');
            return;
        }
        for (let i=0; i<elements.length; i++) {
            const element: TimedDrawable | null = this.mirrorElement(elements[i], network);
            if (element != null) {
                network.addToIndex(element);
            }
        }
    }

    private mirrorElement(element: any, network: StationProvider): TimedDrawable | null {
        if (element.localName == 'path') {
            return new Line(new SvgLine(element), network, this.beckStyle);
        } else if (element.localName == 'text') {
            return new Label(new SvgLabel(element), network);
        }
        return new GenericTimedDrawable(new SvgGenericTimedDrawable(element));
    }

    stationById(id: string): Station | null {
        const element = document.getElementById(id);
        if (element != undefined) {
            return new Station(new SvgStation(<SVGRectElement> <unknown>element));
        }
        return null;
    }

    createVirtualStop(id: string, baseCoords: Vector, rotation: Rotation): Station {
        const helpStop = <SVGRectElement> document.createElementNS(SvgNetwork.SVGNS, 'rect');
        helpStop.id = id;    
        helpStop.setAttribute('data-dir', rotation.name);
        this.setCoord(helpStop, baseCoords);
        helpStop.className.baseVal = 'helper';
        document.getElementById('stations')?.appendChild(helpStop);
        return new Station(new SvgStation(helpStop));  
    };

    private setCoord(element: any, coord: Vector): void {
        element.setAttribute('x', coord.x);
        element.setAttribute('y', coord.y);
    }

    drawEpoch(epoch: string): void {
        let epochLabel;
        if (document.getElementById('epoch-label') != undefined) {
            epochLabel = <SVGTextElement> <unknown> document.getElementById('epoch-label');
            epochLabel.textContent = epoch;       
        }
    }
   
    zoomTo(zoomCenter: Vector, zoomScale: number, animationDurationSeconds: number) {
        console.log(zoomCenter, zoomScale, animationDurationSeconds);
        this.animateFrame(0, animationDurationSeconds/SvgNetwork.FPS, this.currentZoomCenter, zoomCenter, this.currentZoomScale, zoomScale);
        this.currentZoomCenter = zoomCenter;
        this.currentZoomScale = zoomScale;
    }

    private animateFrame(x: number, animationPerFrame: number, fromCenter: Vector, toCenter: Vector, fromScale: number, toScale: number): void {
        if (x < 1) {
            x += animationPerFrame;
            const ease = this.ease(x);
            const delta = fromCenter.delta(toCenter)
            const center = new Vector(delta.x * ease, delta.y * ease).add(fromCenter);
            const scale = (toScale - fromScale) * ease + fromScale;
            this.updateZoom(center, scale);
            const network = this;
            window.requestAnimationFrame(function() { network.animateFrame(x, animationPerFrame, fromCenter, toCenter, fromScale, toScale); });
        } else {
            this.updateZoom(toCenter, toScale);
        }
    }

    private ease(x: number) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    private updateZoom(center: Vector, scale: number) {
        const zoomable = document.getElementById('zoomable');
        if (zoomable != undefined) {
            const origin = this.canvasSize.tl.between(this.canvasSize.br, 0.5);
            zoomable.style.transformOrigin = origin.x + 'px ' + origin.y + 'px';
            zoomable.style.transform = 'scale(' + scale + ') translate(' + (origin.x - center.x) + 'px,' + (origin.y - center.y) + 'px)';
        }
    }
}
