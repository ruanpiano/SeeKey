let globalMidi = null;

/*const midi = Midi.fromUrl("abwhsolo.mid").then(midi => {
    globalMidi = midi;
})*/

const app = new PIXI.Application({
    autoResize: true,
    resolution: devicePixelRatio
});

document.body.appendChild(app.view);

if (!(
        window.File &&
        window.FileReader &&
        window.FileList &&
        window.Blob
    )) {
    document.querySelector("#FileDrop #Text").textContent =
        "Reading files not supported by this browser";
} else {
    const fileDrop = document.querySelector("#FileDrop");

    fileDrop.addEventListener("dragenter", () =>
        fileDrop.classList.add("Hover")
    );

    fileDrop.addEventListener("dragleave", () =>
        fileDrop.classList.remove("Hover")
    );

    fileDrop.addEventListener("drop", () =>
        fileDrop.classList.remove("Hover")
    );

    let input = document.querySelector("#FileDrop input");
    input.addEventListener("change", (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            const file = files[0];
            document.querySelector("#FileDrop #Text").textContent = file.name;
            parseFile(file);
        }
    })
    input.addEventListener("click", function() {
        Tone.start()
    })

}

function parseFile(file) {
    //read the file
    const reader = new FileReader();
    reader.onload = function(e) {
        const midi = new Midi(e.target.result);
        play(midi);
        globalMidi = midi;
        document.querySelector("canvas").setAttribute("style", "display: block;");
        document.querySelector("tone-content").setAttribute("style", "display:none;");
        document.querySelector("loading").setAttribute("style", "display:block;");
    };
    reader.readAsArrayBuffer(file);
}

let loaded = false;

let mainContext = new AudioContext();

let progress = 0;

function play(midi) {
    if (midi) {

        Tone.getTransport().stop()


        loaded = true;

        //Tone.getTransport().bpm.multiplier = midi.header.ppq;
        Tone.getTransport().PPQ = midi.header.ppq;

        if (!midi.header.tempos[0]) {
            globalTempo = 120;
        } else {

            globalTempo = midi.header.tempos[0].bpm;

        }

        //Tone.getTransport().bpm.rampTo(globalTempo)

        let done = 0;

        //console.log(midi)



        midi.tracks.forEach((track, i) => {


            let instrumentName = ""
            let soundkit = "MusyngKite";
            if (track.instrument.percussion) {
                instrumentName = "percussion";
                soundkit = "FluidR3_GM";
            } else {
                instrumentName = track.instrument.name.replace(/[^\w\s]/gi, '').replaceAll(" ", "_");
            }
            if (instrumentName === "synthstrings_1") instrumentName = "synth_strings_1";
            if (instrumentName === "synthstrings_2") instrumentName = "synth_strings_2";
            if (instrumentName === "synthbrass_1") instrumentName = "synth_brass_1";
            if (instrumentName === "synthbrass_2") instrumentName = "synth_brass_2";
            if (instrumentName === "clavi") instrumentName = "clavinet";

            Soundfont.instrument(mainContext, instrumentName, { 'soundfont': soundkit }).then(instrument => {

                midi.header.tempos.forEach(tempo => {
                    Tone.getTransport().schedule(function() {
                        //globalTempo = tempo.bpm;
                        // Tone.getTransport().bpm.value = tempo.bpm
                    }, tempo.time + (Tone.getTransport().bpm.value / 60))
                });

                if (track.controlChanges[64]) {

                    track.controlChanges[64].forEach(event => {
                        //console.log(event)
                        Tone.getTransport().schedule(function() {
                            if (event.value == 1)
                                instrument.opts.release = 127
                            else
                                instrument.opts.release = 0.7;
                        }, event.time + (Tone.getTransport().bpm.value / 60))
                    })
                }

                track.notes.forEach(note => {
                    /*if (track.instrument.percussion) return;
                    if (track.instrument.family === "percussive") return;
                    if (track.instrument.name === "timpani") return;*/
                    //piano.play(note.name, piano.context.currentTime + note.time, { 'gain': note.velocity * 2 }).stop(piano.context.currentTime + note.time + note.duration)
                    Tone.getTransport().schedule(function(time) {
                        let newNote = new PIXI.Graphics();
                        let hex = Math.floor(0xFF0000);
                        newNote.beginFill(hex, note.velocity)
                        let height = (note.duration * Tone.getTransport().bpm.value);
                        newNote.drawRect((note.midi - 21) / 88 * app.screen.width, 0 - height, (app.screen.width / 88), height);
                        newNote.endFill();
                        let bar = Tone.getTransport().bpm.value / 60;
                        newNote.filters = [new PIXI.filters.ColorMatrixFilter()]
                        newNote.filters[0].hue(track.channel * (app.ticker._requestId / Tone.getTransport().bpm.value))
                        app.stage.addChild(newNote);
                        instrument.schedule(mainContext.currentTime + bar, [{ 'note': note.name, 'gain': note.velocity * 2, 'duration': note.duration }])
                            // newNote.filters = [new PIXI.filters.GodrayFilter()]
                    }, note.time)
                })

                done++;
                //console.log(done);
                progress = (100 * (done / globalMidi.tracks.length)).toFixed(2)
                if (progress != 100) {
                    document.querySelector("loading").textContent = "Loading, please wait... " + progress + " %";
                } else {
                    document.querySelector("loading").textContent = "Click anywhere to start";
                }
            });

        })

        app.ticker.add(function() {
            let executed = false;
            if (Tone.getContext().state !== "running") {
                Tone.getContext().resume();
                return;
            }
            if (mainContext.state !== "running") {
                mainContext.resume();
                return;
            }
            if (done == midi.tracks.length && !executed && Tone.getContext().state === "running" && mainContext.state === "running") {
                Tone.getTransport().start();
                document.querySelector("loading").setAttribute("style", "display:none;");
                executed = true;
            }
        })

    }
}

app.ticker.add(function(time) {
    app.stage.children.forEach(child => {
        child.y += time * (app.screen.height / Tone.getTransport().bpm.value);

        if (child.y > app.screen.height + child.height) {
            child.destroy();
            app.stage.removeChild(child);
        }
    })

    if (Tone.getTransport()._timeline._timeline.length > 0) {
        if (globalMidi && loaded && (false) && (app.stage.children.length == 0)) {
            console.log("Finished")
            console.log(Tone.getTransport()._timeline._timeline[Tone.getTransport()._timeline._timeline.length - 1].time)
            console.log(Tone.getTransport().toTicks(Tone.now()))
            document.querySelector("canvas").setAttribute("style", "display: none;");
            document.querySelector("tone-content").setAttribute("style", "display:block;");
            document.querySelector("loading").setAttribute("style", "display:block;");
            globalMidi = null;
            loaded = false;
        }
    }
});