let globalMidi = null;

const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "tablet";
    }
    if (
        /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
            ua
        )
    ) {
        return "mobile";
    }
    return "desktop";
};

/*const midi = Midi.fromUrl("abwhsolo.mid").then(midi => {
    globalMidi = midi;
})*/

let app = null;

initApp();

document.querySelector(".webgl").textContent += app.renderer.context.webGLVersion;

function initApp() {
    let appWidth = screen.width / 3;
    let appHeight = screen.height / 3;
    if (getDeviceType() === "desktop") {
        appWidth = screen.width
        appHeight = screen.height;
    }
    app = new PIXI.Application({
        autoResize: true,
        resolution: devicePixelRatio,
        width: 800,
        height: 600,

        transparent: true,
    });
    document.body.appendChild(app.view);
    app.stage.sortableChildren = true;
}





const blacknotes = [1, 3, 6, 8, 10, 13, 15, 18, 20, 22, 25, 27, 30, 32, 34, 37, 39, 42, 44, 46, 49, 51, 54, 56, 58, 61, 63, 66, 68, 70, 73, 75, 78, 80, 82, 85, 87, 90, 92, 94, 97, 99, 102, 104, 106, 109, 111, 114, 116, 118, 121, 123, 126];

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
            //document.querySelector("#FileDrop #Text").textContent = file.name;
            parseFile(file);
        }
    })
    input.addEventListener("click", function() {
        Tone.start()
    })

}

function rgbToHex(r, g, b) {
    let value = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    return parseInt(value.replace(/^#/, ''), 16);
}

function parseFile(file) {
    //read the file
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log(file);
        window.DD_RUM && DD_RUM.addUserAction('ParseFile', { 'filename': file.name, 'size': file.size });
        const midi = new Midi(e.target.result);
        if (!app) initApp();
        play(midi);
        globalMidi = midi;
        document.querySelector("canvas").setAttribute("style", "display: block;");
        document.querySelector("tone-content").setAttribute("style", "display:none;");
        document.querySelector("loading").setAttribute("style", "display:block;");
        document.querySelector("bottom").setAttribute("style", "display:none;");
    };
    reader.readAsArrayBuffer(file);
}

let loaded = false;

let mainContext = new AudioContext();

let progress = 0;

function fancyTimeFormat(duration) {
    // Hours, minutes and seconds
    var hrs = ~~(duration / 3600);
    var mins = ~~((duration % 3600) / 60);
    var secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

function play(midi) {
    if (midi) {
        let progress = 0;

        window.DD_RUM && DD_RUM.addUserAction('Play', { 'duration': midi.duration, 'name': midi.name });

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
        let valid = 0;

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
            if (instrumentName === "synth_voice") instrumentName = "lead_6_voice";

            if (track.notes.length <= 0) return;

            valid++;

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
                        newNote.beginFill(0xFFFFFF, note.velocity)
                        let height = (note.duration * Tone.getTransport().bpm.value);
                        newNote.x = (note.midi - 21) / 88 * app.screen.width
                        newNote.y = 0 - height
                        newNote.width = (app.screen.width / 88)
                        newNote.height = height
                        newNote.drawRect(0, 0, (app.screen.width / 88), height);
                        newNote.endFill();
                        let bar = Tone.getTransport().bpm.value / 60;
                        //newNote.filters = [new PIXI.filters.ColorMatrixFilter()]
                        //newNote.filters[0].hue(track.channel * (app.ticker._requestId / Tone.getTransport().bpm.value))
                        //console.log(track.channel)

                        switch (track.channel) {
                            case 1:
                                newNote.tint = 0x62E357;
                                break;
                            case 2:
                                newNote.tint = 0xe85f3d;
                                break;
                            case 3:
                                newNote.tint = 0xfc2587;
                                break;
                            case 4:
                                newNote.tint = 0x533fe7;
                                break;
                            case 5:
                                newNote.tint = 0x4e88ed;
                                break;
                            case 6:
                                newNote.tint = 0xdcc5e9;
                                break;
                            case 7:
                                newNote.tint = 0xfce037;
                                break;
                            case 8:
                                newNote.tint = 0xeeaead;
                                break;
                            case 9:
                                newNote.tint = 0xbb0429;
                                break;
                            case 10:
                                newNote.tint = 0xbeca58;
                                break;
                            case 11:
                                newNote.tint = 0xbc1f6d;
                                break;
                            case 12:
                                newNote.tint = 0xcdfc8b;
                                break;
                            case 13:
                                newNote.tint = 0x5c45b2;
                                break;
                            case 14:
                                newNote.tint = 0xd50b0d;
                                break;
                            case 15:
                                newNote.tint = 0xaff4c3;
                                break;
                            case 16:
                                newNote.tint = 0x04eccd;
                                break;
                            default:
                                newNote.tint = 0xFFF1234;
                                break;
                        }
                        newNote.type = "note"
                        newNote.zIndex = -1;
                        newNote.note = note;
                        app.stage.addChild(newNote);
                        instrument.schedule(mainContext.currentTime + bar, [{ 'note': note.name, 'gain': note.velocity * 2, 'duration': note.duration }])
                            // newNote.filters = [new PIXI.filters.GodrayFilter()]
                    }, note.time)
                })

                done++;
                progress = (100 * (done / valid)).toFixed(2)
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
            if (done == valid && !executed && Tone.getContext().state === "running" && mainContext.state === "running") {
                Tone.getTransport().start();
                document.querySelector("loading").setAttribute("style", "display:none;");
                executed = true;
            }
        })

        initProgressBar();
        initVerifier();

    }
}

function initProgressBar() {
    var progressBar = new PIXI.Graphics()
    progressBar.beginFill(0xFFFFFF, 1)
    progressBar.drawRect(0, 0, 10, 10);
    progressBar.endFill();
    progressBar.height = 10
    progressBar.y = 0
    progressBar.type = "progress"
    progressBar.x = 0
    app.stage.addChild(progressBar);

    const style = new PIXI.TextStyle({
        fontFamily: 'Roboto',
        fontSize: 15,
        fontWeight: 'bold',
        fill: ['#ffffff'],
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6,
        wordWrap: true,
        wordWrapWidth: 440,
        lineJoin: 'round'
    });

    var time = new PIXI.Text("0:00 / 0:00", style);
    time.type = "text";
    time.position.x = 0;
    time.position.y = 15;
    app.stage.addChild(time);
}

function initVerifier() {
    app.ticker.addOnce(function(time) {
        for (let i = 21; i <= 108; i++) {
            let note = new PIXI.Graphics();
            let noteSize = (app.screen.width / 88);
            note.x = (i - 21) * (app.screen.width / 88);
            note.y = app.screen.height - 50;
            note.width = noteSize;
            note.midi = i;
            note.beginFill(0xFFFFFF, 1);
            if (blacknotes.includes(i)) {
                note.tint = 0x000000;
                note.drawRect(0, 0, noteSize, 25);
                note.zIndex = 101;
                note.height = 25;
            } else {
                note.tint = 0xFFFFFF;
                note.drawRect(0, 0, noteSize, 50);
                note.height = 50;
                note.zIndex = 100;
            }
            note.endFill();
            note.type = "keyboard";
            //note.filters = [new PIXI.filters.ColorOverlayFilter()]
            //note.filters[0].enabled = false
            //note.filters[0].color = 0xFF0000
            app.stage.addChild(note);
        }
        let whiteBackground = new PIXI.Graphics();
        whiteBackground.beginFill(0xFFFFFF, 1)
        whiteBackground.drawRect(0, app.screen.height - 50, app.screen.width, 50)
        whiteBackground.endFill()

        app.stage.addChild(whiteBackground)
    })
    app.ticker.add(function(time) {
        app.stage.children.forEach(function(child) {
            if (child.type == "progress" && loaded) {
                child.width = app.screen.width * Tone.Transport.seconds / (globalMidi.duration + app.screen.height / Tone.getTransport().bpm.value / 2)

                if (child.width >= app.screen.width) {
                    //child.destroy();
                    app.stage.removeChild(child);
                    return;
                }
            }

            if (child.type == "text" && Tone.Transport.seconds >= (app.screen.height - 50) / (Tone.getTransport().bpm.value * 2)) {
                child.text = fancyTimeFormat(Tone.Transport.seconds - (app.screen.height - 50) / (Tone.getTransport().bpm.value * 2)) + ' / ' + fancyTimeFormat(globalMidi.duration)
            }

            if (child.type === "note") {
                child.y += time * (app.screen.height / Tone.getTransport().bpm.value);

                app.stage.children.filter(function(search) {
                        if (search.midi == child.note.midi && child.y > app.screen.height - child.height - 50) {
                            //search.filters[0].color = child.tint;
                            //search.filters[0].enabled = true;
                            search.tint = child.tint;
                        }
                        if (search.midi == child.note.midi && child.y > app.screen.height - 50) {
                            if (blacknotes.includes(search.midi))
                                search.tint = 0x000000
                            else
                                search.tint = 0xFFFFFF
                                //search.filters[0].enabled = false;
                        }
                    }) //_enabledFilters[0].matrix
            }

            if (child.y > app.screen.height + child.height) {
                //child.destroy();
                app.stage.removeChild(child);
            }
        })

        if (Tone.getTransport()._timeline._timeline.length > 0) {
            notes = app.stage.children.filter(function(a) { if (a.type == "note") return a })
            if (globalMidi && loaded && (Tone.Transport.seconds > globalMidi.duration) && (notes.length == 0)) {
                //console.log("Finished")
                window.DD_RUM && DD_RUM.addUserAction('Finished');
                //console.log(Tone.getTransport()._timeline._timeline[Tone.getTransport()._timeline._timeline.length - 1].time)
                //console.log(Tone.getTransport().toTicks(Tone.Transport.seconds))
                document.querySelector("canvas").setAttribute("style", "display: none;");
                document.querySelector("tone-content").setAttribute("style", "display:block;");
                document.querySelector("bottom").setAttribute("style", "display:block;");
                //document.querySelector("loading").setAttribute("style", "display:block;");

                //app.ticker.destroy();
                //app.ticker = new PIXI.Ticker.constructor
                Tone.Transport.cancel(0)

                app.ticker.stop()
                app.destroy()
                app = null;
                initApp();
                app.ticker.start()

                document.querySelector("input").value = ""
                document.querySelector("input").files = null;

                globalMidi = null;
                loaded = false;

                for (let i = 0; i < document.getElementsByTagName("canvas").length; i++) {
                    document.getElementsByTagName("canvas")[i].remove();
                }


            }
        }
    });
}