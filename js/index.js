let ticker = PIXI.Ticker.system;
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

let globalTempo = 0;

let synthArray = [];

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
            synthArray.push(new Tone.PolySynth().toDestination());
            track.notes.forEach(note => {
                if (track.instrument.percussion) return;
                //synthArray[i].triggerAttackRelease(note.name, note.duration, note.time + Tone.now() + (globalTempo / PIXI.Ticker.system.FPS), note.velocity)
                Tone.getDraw().schedule(function() {
                    //synthArray[i].triggerAttackRelease(note.name, note.duration, Tone.now() + (globalTempo / 60), note.velocity)
                    let newNote = new PIXI.Graphics();
                    newNote.beginFill(0xFF0000, note.velocity + 0.2)
                    let height = (note.duration * globalTempo);
                    newNote.drawRect((note.midi - 21) / 88 * app.screen.width, 0 - height, (app.screen.width / 88), height);
                    newNote.endFill();
                    newNote.note = note;
                    newNote.note.channel = i;
                    newNote.time = Date.now();
                    newNote.note.played = false;
                    app.stage.addChild(newNote);
                    globalPiano.play(note.name, globalPiano.context.currentTime + (globalTempo / 60), { 'gain': note.velocity * 2 }).stop(globalPiano.context.currentTime + (globalTempo / 60) + note.duration)
                        // newNote.filters = [new PIXI.filters.GodrayFilter()]
                }, note.time + Tone.now())
            })

        });
    }


    PIXI.Ticker.shared.add(function(time) {
        app.stage.children.forEach(child => {
            child.y += app.screen.height / globalTempo;
            if (child.y >= app.screen.height) {
                note = child.note;
                if (!note.played) {
                    // synthArray[note.channel].triggerAttackRelease(note.name, note.duration, synthArray[0].now(), note.velocity)
                    /*let fonte = "audio/" + note.pitch + note.octave + "v6.ogg";
                    console.log(fonte)
                    var sound = new Howl({ src: fonte });
                    sound.play();*/
                    //globalPiano.play(note.name, globalPiano.context.currentTime, { 'gain': note.velocity }).stop(globalPiano.context.currentTime + note.duration)
                    note.played = true;

                }
            }
            if (child.y >= app.screen.height * 2) {
                app.stage.removeChild(child);
            }
        })
    })
}

app.stage.filters = [
    // new PIXI.filters.GlowFilter({ distance: 5, outerStrength: 2 })
];