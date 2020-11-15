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

    document
        .querySelector("#FileDrop input")
        .addEventListener("change", (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                const file = files[0];
                document.querySelector("#FileDrop #Text").textContent = file.name;
                parseFile(file);
            }
        });
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
    };
    reader.readAsArrayBuffer(file);
}

let globalPiano = null;

Soundfont.instrument(new AudioContext(), 'acoustic_grand_piano').then(piano => {
    globalPiano = piano;
})

function play(midi) {
    if (midi) {

        if (!midi.header.tempos[0]) {
            globalTempo = 120;
        } else {

            globalTempo = midi.header.tempos[0].bpm;
        }

        midi.tracks.forEach((track, i) => {
            /*midi.header.tempos.forEach(tempo => {
                Tone.getDraw().schedule(function() {
                    globalTempo = tempo.bpm;
                }, tempo.time + Tone.now() + (globalTempo / 60))
            });*/

            if (track.controlChanges[64]) {

                track.controlChanges[64].forEach(event => {
                    //console.log(event)
                    Tone.getDraw().schedule(function() {
                        if (event.value == 1)
                            globalPiano.opts.release = 127
                        else
                            globalPiano.opts.release = 0.7;
                    }, event.time + Tone.now() + (globalTempo / 60))
                })
            }

            track.notes.forEach(note => {
                if (track.instrument.percussion) return;
                //globalPiano.play(note.name, globalPiano.context.currentTime + note.time, { 'gain': note.velocity * 2 }).stop(globalPiano.context.currentTime + note.time + note.duration)
                Tone.getDraw().schedule(function() {
                    let newNote = new PIXI.Graphics();
                    //let hex = Math.floor(Math.abs(Math.sin(Tone.getDraw()._animationFrame) / 200) + 0xFFFFFF);
                    newNote.beginFill(0xFF0000, note.velocity)
                    let height = (note.duration * globalTempo);
                    newNote.drawRect((note.midi - 21) / 88 * app.screen.width, 0 - height, (app.screen.width / 88), height);
                    newNote.endFill();
                    // newNote.pivot
                    newNote.note = note;
                    newNote.note.channel = i;
                    newNote.time = Date.now();
                    newNote.note.played = false;
                    newNote.filters = [new PIXI.filters.ColorMatrixFilter()]
                    newNote.filters[0].hue(Tone.getDraw()._animationFrame / globalTempo)
                    app.stage.addChild(newNote);
                    globalPiano.play(note.name, globalPiano.context.currentTime + (globalTempo / 60), { 'gain': note.velocity * 2 }).stop(globalPiano.context.currentTime + (globalTempo / 60) + note.duration)
                        // newNote.filters = [new PIXI.filters.GodrayFilter()]
                }, note.time + globalPiano.context.currentTime)
            })

        });
    }
}

PIXI.Ticker.shared.add(function(time) {
    app.stage.children.forEach(child => {
        child.y += app.screen.height / globalTempo;

        if (child.y > app.screen.height + child.height) {
            child.destroy();
            app.stage.removeChild(child);
        }
    })

    if (globalMidi && (Tone.getDraw()._events.length == 0) && (app.stage.children.length == 0)) {
        console.log("Finished")
        document.querySelector("canvas").setAttribute("style", "display: none;");
        document.querySelector("tone-content").setAttribute("style", "display:block;");
        globalMidi = null;
    }
});