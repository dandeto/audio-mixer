/*************************************************************************
		--Audio Graph--
		-MASTER (gain node)
		-EQUILIZERS
		 -> High
		 -> Mid
		 -> Low
		-FILTERS
		 ->Lowpass
		 ->Highpass
		-EFFECTS

		-AUDIO DESTINATION
	*************************************************************************/

function main (fr) {
	// AudioContext
	//The entire AudioContext must be created after user gesture (augh)

	const ctx = new AudioContext();
	const master = ctx.createGain(); //master audio channel which doubles as gain node
	master.gain.value = .5;
	master.connect(ctx.destination);

	//eq modules

	const eq = {};
	eq.high = ctx.createBiquadFilter();
	eq.high.type = "peaking";
	eq.high.frequency.value = 6000;
	eq.high.gain.value = 0;
	eq.high.connect(master);

	eq.mid = ctx.createBiquadFilter();
	eq.mid.type = "peaking";
	eq.mid.frequency.value = 1250;
	eq.mid.gain.value = 0;
	eq.mid.connect(eq.high);

	eq.bass = ctx.createBiquadFilter();
	eq.bass.type = "peaking";
	eq.bass.frequency.value = 100;
	eq.bass.gain.value = 0;
	eq.bass.connect(eq.mid);

	//standard filters

	const lpf = ctx.createBiquadFilter(); //low pass filter
	lpf.type = "lowpass";
	lpf.frequency.value = 22050;
	lpf.connect(eq.bass);

	const hpf = ctx.createBiquadFilter(); //high pass filter
	hpf.type = "highpass";
	hpf.frequency.value = 0;
	hpf.connect(lpf);

	//effects

	const convolver = ctx.createConvolver(); //work on this at some point - use for reverb

	function makeDistortionCurve(amount) { // from MDN - not my code
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
	let distortion = ctx.createWaveShaper();
	distortion.curve = makeDistortionCurve(0);
	distortion.oversample = '4x';
	distortion.connect(hpf);


	// Controls


	function filter(f) {
		if (f < -.04)
			lpf.frequency.value = Math.log10(-1*f)*10000*-1; //log curve eases in with (-) #s
		else if (f > .04)
			hpf.frequency.value = Math.pow(f, 2)*10000; //x^2 curve eases in with (+) #s
		else {
			lpf.frequency.value = 22050; //turn filter off
			hpf.frequency.value = 0;
		}
	}


	// Load audio


	let audioNode = ctx.createBufferSource(), //make these accessable
	    start_time, duration;

	let audioBuffer = ctx.decodeAudioData(fr.result).then(function(buffer) {
		audioNode.buffer = buffer;
		audioNode.connect(distortion); //connect to lowest node on the chain - I did the whole thing backward :(
		waveform(buffer); //display waveform
		audioNode.start();
		start_time = audioNode.context.currentTime;
		duration = buffer.duration;
		setInterval(marker, 300);
	});


	// Display waveform


	function waveform(buffer) {
		const SCALE = 96; //default 48 for faster loading with decent quality - 96 for better quality

		let canvas = document.getElementById("c"); //canvas boilerplate
		let ctx = canvas.getContext("2d");
		ctx.fillStyle = "#aaaaaa"; //bg
	  	ctx.fillRect(0, 0, canvas.width, canvas.height);
	  	ctx.lineWidth = 1; //line
	  	ctx.strokeStyle = "#000000";

		for (let c = 0; c < buffer.numberOfChannels; c++) { //loop through all audio channels.
			let dataArray = buffer.getChannelData(c); //store PCM data in array
			let buffer_resolution = Math.floor(dataArray.length / buffer.duration/SCALE); // # of elements in the buffer for the song duration / the scale
		  	let graphic_resolution = canvas.width / Math.floor(buffer.duration*SCALE); // # of px to increase by in the x direction to poll for new y coord.
		  	let x = 0;

		  	ctx.beginPath();
		  	for (let i = 0; i < dataArray.length; i+=buffer_resolution) {

				let y = (dataArray[i] * canvas.height / 2) + canvas.height/2; //scale and center the PCM data into the canvas

				if (!(i == 0))  ctx.lineTo(x, y);
				else 			ctx.moveTo(x, y);

				x += graphic_resolution;
			}

			ctx.lineTo(canvas.width, canvas.height / 2); //straight line to the right
			ctx.stroke();
		}
	}

	//display marker that shows position in song

	let canvas = document.getElementById("c"); //canvas boilerplate (don't want to redo this every marker update)
	let canvas_ctx = canvas.getContext("2d");
	function marker() {
		canvas_ctx.fillStyle = "#ff0000"; //style
		canvas_ctx.globalAlpha = .15; //make translucent

		let time = audioNode.context.currentTime - start_time; //poll current time
		//proportion the time within the song to the canvas
		let position = time * canvas.width / duration;

		canvas_ctx.fillRect(position, 0, 1, canvas.height);
		canvas_ctx.globalAlpha = 1; //revert
	}


	// UI


	//Event listeners

	document.getElementById("slider").addEventListener("mousemove", function() {master.gain.value = this.value}, false);
	document.getElementById("h_slider").addEventListener("mousemove", function() {eq.high.gain.value = this.value}, false);
	document.getElementById("m_slider").addEventListener("mousemove", function() {eq.mid.gain.value = this.value}, false);
	document.getElementById("b_slider").addEventListener("mousemove", function() {eq.bass.gain.value = this.value}, false);
	document.getElementById("f_slider").addEventListener("mousemove", function() {filter(this.value)}, false);
	document.getElementById("d_slider").addEventListener("mousemove", function() {distortion.curve = makeDistortionCurve(parseInt(this.value, 10))}, false);
}


// INIT


document.getElementById("file").addEventListener("change", function() { //browser needs user input
	if (this.files[0].type.indexOf("audio") != 1) { //input audio file only
		let fr = new FileReader();
		fr.onload = function() { main(this); }; //exit init
		fr.readAsArrayBuffer(this.files[0]); //read in file as buffer
	}
}, false);
