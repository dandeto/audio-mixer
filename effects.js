// THis file contains all effect circuits.

class Effect {
	constructor(ctx, input, output) {
		this.input = input;
		this.output = output;

		this.wet = ctx.createGain();
		this.wet.gain.value = 0; //modified by user
		this.wet.connect(output);
	}
}

/******************************************************************

		in ----------------------- out
									|
								 balance
		|							|
	  delay ---------------------- wet
	   | |
	feedback

	******************************************************************/

class Delay extends Effect {
	constructor(ctx, input, output) {
		super(ctx, input, output);

		this.delay = ctx.createDelay();
		this.feedback = ctx.createGain();

		this.feedback.gain.value = .25;
		this.delay.delayTime.value = 1; //default value - exposed so can be manipulated by user

		this.input.connect(this.delay); //already connected to output, now connect to delay circuit
		this.delay.connect(this.feedback);
		this.feedback.connect(this.delay);
		this.delay.connect(this.wet);
	}
}

/******************************************************************

		in ----------------------- out
		|							|
		|						 balance
		|							|
	  reverb --------------------- wet

	*****************************************************************/

class Reverb extends Effect {
	constructor(ctx, input, output) {
		super(ctx, input, output);

		this.convolver = ctx.createConvolver();
		window.fetch("https://raw.githubusercontent.com/dandeto/audio-mixer/master/ir.mp3") //easiest way to get this audio
	    .then(response => response.arrayBuffer())
	    .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
	    .then(buffer => {
	    	this.convolver.buffer = buffer;

			this.input.connect(this.convolver); //already connected to output, now connect to the circuit
			this.convolver.connect(this.wet);
		});
	}
}

class Distortion extends Effect {
	constructor(ctx, input, output) {
		super(ctx, input, output);

		this.distortion = ctx.createWaveShaper();
		this.distortion.curve = this.makeDistortionCurve(0);
		this.distortion.oversample = '4x';
		this.wet.gain.value = 1; //manipulated by user (should distortion be inline?)
		this.input.connect(this.distortion); //already connected to output, now connect to the circuit
		this.distortion.connect(this.wet);
	}

	makeDistortionCurve(amount) { // from MDN - not my code
		var k = typeof amount === 'number' ? amount : 50,
		n_samples = 44100,
		curve = new Float32Array(n_samples),
		deg = Math.PI / 180,
		i = 0,
		x;
		for ( ; i < n_samples; ++i ) {
			x = i * 2 / n_samples - 1;
			curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
		}
		return curve;
	}
}
