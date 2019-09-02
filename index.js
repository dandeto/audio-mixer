/*************************************************************************
		--Audio Graph--

		-Audio Input
		-Preamp
		-FILTERS
		 ->Lowpass
		 ->Highpass
		-EQUILIZERS
		 -> High
		 -> Mid
		 -> Low
		-EFFECTS

		-AUDIO DESTINATION
*************************************************************************/

//TODO: let user load song after song however I decide to implement it.


function main (fr) { //after audio loads
	//The entire AudioContext must be created after user gesture (augh)

	const ctx = new AudioContext //create audio modules
	const preamp = ctx.createGain(); //audio inputs here
	preamp.gain.value = .5;

	//standard filters

	const lpf = ctx.createBiquadFilter(); //low pass filter
	lpf.type = "lowpass";
	lpf.frequency.value = 22050;

	const hpf = ctx.createBiquadFilter(); //high pass filter
	hpf.type = "highpass";
	hpf.frequency.value = 0;

	//eq modules

	const eq = {};
	eq.high = ctx.createBiquadFilter();
	eq.high.type = "peaking";
	eq.high.frequency.value = 6000;
	eq.high.gain.value = 0;

	eq.mid = ctx.createBiquadFilter();
	eq.mid.type = "peaking";
	eq.mid.frequency.value = 1250;
	eq.mid.gain.value = 0;

	eq.bass = ctx.createBiquadFilter();
	eq.bass.type = "peaking";
	eq.bass.frequency.value = 100;
	eq.bass.gain.value = 0;

	//effects
    
	let distortion = new Distortion(ctx, eq.bass, ctx.destination);//define effect module with input and output
	let delay = new Delay(ctx, eq.bass, ctx.destination);
	let reverb = new Reverb(ctx, eq.bass, ctx.destination);


	// Load audio


	let audioNode = ctx.createBufferSource(), //make these accessable
	    start_time, duration;

	let audioBuffer = ctx.decodeAudioData(fr.result).then(function(buffer) {
		audioNode.buffer = buffer;

		audioNode.connect(preamp); //create audio graph
		preamp.connect(lpf);
		lpf.connect(hpf);
		hpf.connect(eq.high);
		eq.high.connect(eq.mid);
		eq.mid.connect(eq.bass);
		eq.bass.connect(ctx.destination);


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

	document.getElementById("slider").addEventListener("mousemove", function() {preamp.gain.value = this.value}, false);
	document.getElementById("h_slider").addEventListener("mousemove", function() {eq.high.gain.value = this.value}, false);
	document.getElementById("m_slider").addEventListener("mousemove", function() {eq.mid.gain.value = this.value}, false);
	document.getElementById("b_slider").addEventListener("mousemove", function() {eq.bass.gain.value = this.value}, false);
	document.getElementById("f_slider").addEventListener("mousemove", function() {
		if (this.value < -.04)
			lpf.frequency.value = Math.log10(-1*this.value)*10000*-1; //log curve eases in with (-) #s
		else if (this.value > .04)
			hpf.frequency.value = Math.pow(this.value, 2)*10000; //x^2 curve eases in with (+) #s
		else {
			lpf.frequency.value = 22050; //turn filter off
			hpf.frequency.value = 0;
		}
	}, false);
	document.getElementById("d_slider").addEventListener("mousemove", function() {distortion.distortion.curve = distortion.makeDistortionCurve(parseInt(this.value, 10))}, false);
	document.getElementById("delay_balance_slider").addEventListener("mousemove", function() {delay.wet.gain.value = this.value;}, false);
	document.getElementById("delay_time_slider").addEventListener("mousemove", function() {delay.delay.delayTime.value = this.value;}, false);
	document.getElementById("delay_balance_slider").addEventListener("mousemove", function() {delay.feedback.gain.value = this.value;}, false);
}


// INIT


document.getElementById("file").addEventListener("change", function() { //browser needs user input
	if (this.files[0].type.indexOf("audio") != 1) { //input audio file only
		let fr = new FileReader();
		fr.onload = function() { main(this); }; //exit init
		fr.readAsArrayBuffer(this.files[0]); //read in file as buffer
	}
}, false);
