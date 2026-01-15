/**
 * Author: Gery Casiez
 * Reference: http://www.lifl.fr/~casiez/1euro/
 */
class LowPassFilter {
    constructor(alpha, initval = 0) {
        this.y = initval;
        this.s = initval;
        this.alpha = alpha;
    }
    setAlpha(alpha) {
        if (alpha <= 0 || alpha > 1) {
            return;
        }
        this.alpha = alpha;
    }
    filter(value) {
        this.y = value;
        this.s = this.alpha * value + (1.0 - this.alpha) * this.s;
        return this.s;
    }
    filterWithAlpha(value, alpha) {
        this.setAlpha(alpha);
        return this.filter(value);
    }
    lastValue() {
        return this.y;
    }
}
export class OneEuroFilter {
    constructor({ minCutOff = 1.0, beta = 0.0, dCutOff = 1.0 }) {
        this.minCutOff = minCutOff;
        this.beta = beta;
        this.dCutOff = dCutOff;
        this.x = null;
        this.dx = null;
        this.lastTime = null;
    }
    _alpha(cutoff, te) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / te);
    }
    reset() {
        this.lastTime = null;
        this.x = null;
        this.dx = null;
    }
    filter(time, value) {
        if (this.lastTime === null || this.x === null) {
            this.lastTime = time;
            this.x = value.map((v) => new LowPassFilter(this._alpha(this.minCutOff, 1.0), v));
            this.dx = value.map((v) => new LowPassFilter(this._alpha(this.dCutOff, 1.0), 0));
            return value;
        }
        const te = (time - this.lastTime) / 1000.0;
        if (te <= 0)
            return value;
        this.lastTime = time;
        const filteredValue = [];
        for (let i = 0; i < value.length; i++) {
            const edvalue = (value[i] - this.x[i].lastValue()) / te;
            const alpha_d = this._alpha(this.dCutOff, te);
            const edvalue_filtered = this.dx[i].filterWithAlpha(edvalue, alpha_d);
            const cutoff = this.minCutOff + this.beta * Math.abs(edvalue_filtered);
            const alpha = this._alpha(cutoff, te);
            filteredValue[i] = this.x[i].filterWithAlpha(value[i], alpha);
        }
        return filteredValue;
    }
}
