var detected_result = "";
var new_detection = false;
var last_detection = 0;

$(function () {
    var resultCollector = Quagga.ResultCollector.create({
        capture: true,
        capacity: 20,
        blacklist: [{
            code: "WIWV8ETQZ1", format: "code_93"
        }, {
            code: "EH3C-%GU23RK3", format: "code_93"
        }, {
            code: "O308SIHQOXN5SA/PJ", format: "code_93"
        }, {
            code: "DG7Q$TV8JQ/EN", format: "code_93"
        }, {
            code: "VOFD1DB5A.1F6QU", format: "code_93"
        }, {
            code: "4SO64P4X8 U4YUU1T-", format: "code_93"
        }],
        filter: function (codeResult) {
            // only store results which match this constraint
            // e.g.: codeResult
            return true;
        }
    });
    var App = {
        init: function () {
            var self = this;

            Quagga.init(this.state, function (err) {
                if (err) {
                    return self.handleError(err);
                }
                //Quagga.registerResultCollector(resultCollector);
                App.attachListeners();
                App.checkCapabilities();
                Quagga.start();
            });
        },
        handleError: function (err) {
            console.log(err);
        },
        checkCapabilities: function () {
            var track = Quagga.CameraAccess.getActiveTrack();
            var capabilities = {};
            if (typeof track.getCapabilities === 'function') {
                capabilities = track.getCapabilities();
            }
            this.applySettingsVisibility('zoom', capabilities.zoom);
            this.applySettingsVisibility('torch', capabilities.torch);
        },
        updateOptionsForMediaRange: function (node, range) {
            console.log('updateOptionsForMediaRange', node, range);
            var NUM_STEPS = 6;
            var stepSize = (range.max - range.min) / NUM_STEPS;
            var option;
            var value;
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            for (var i = 0; i <= NUM_STEPS; i++) {
                value = range.min + (stepSize * i);
                option = document.createElement('option');
                option.value = value;
                option.innerHTML = value;
                node.appendChild(option);
            }
        },
        applySettingsVisibility: function (setting, capability) {
            // depending on type of capability
            if (typeof capability === 'boolean') {
                var node = document.querySelector('input[name="settings_' + setting + '"]');
                if (node) {
                    node.parentNode.style.display = capability ? 'block' : 'none';
                }
                return;
            }
            if (window.MediaSettingsRange && capability instanceof window.MediaSettingsRange) {
                var node = document.querySelector('select[name="settings_' + setting + '"]');
                if (node) {
                    this.updateOptionsForMediaRange(node, capability);
                    node.parentNode.style.display = 'block';
                }
                return;
            }
        },
        initCameraSelection: function () {
            var streamLabel = Quagga.CameraAccess.getActiveStreamLabel();

            return Quagga.CameraAccess.enumerateVideoDevices()
                .then(function (devices) {
                    function pruneText(text) {
                        return text.length > 30 ? text.substr(0, 30) : text;
                    }
                    var $deviceSelection = document.getElementById("deviceSelection");
                    while ($deviceSelection.firstChild) {
                        $deviceSelection.removeChild($deviceSelection.firstChild);
                    }
                    devices.forEach(function (device) {
                        var $option = document.createElement("option");
                        $option.value = device.deviceId || device.id;
                        $option.appendChild(document.createTextNode(pruneText(device.label || device.deviceId || device.id)));
                        $option.selected = streamLabel === device.label;
                        $deviceSelection.appendChild($option);
                    });
                });
        },
        attachListeners: function () {
            var self = this;

            self.initCameraSelection();
            $(".controls").on("click", "button.stop", function (e) {
                e.preventDefault();
                Quagga.stop();
                self._printCollectedResults();
            });

            // $(".controls").on("click", "button.start", function (e) {
            //     App.attachListeners();
            //     App.checkCapabilities();
            //     Quagga.start();
            // });

            $(".controls .reader-config-group").on("change", "input, select", function (e) {
                e.preventDefault();
                var $target = $(e.target),
                    value = $target.attr("type") === "checkbox" ? $target.prop("checked") : $target.val(),
                    name = $target.attr("name"),
                    state = self._convertNameToState(name);

                console.log("Value of " + state + " changed to " + value);
                self.setState(state, value);
            });
        },
        _printCollectedResults: function () {
            var results = resultCollector.getResults(),
                $ul = $("#result_strip ul.collector");

            results.forEach(function (result) {
                var $li = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');

                // $li.find("img").attr("src", result.frame);
                $li.find("h4.code").html(result.codeResult.code + " (" + result.codeResult.format + ")");
                $ul.prepend($li);
            });
        },
        _accessByPath: function (obj, path, val) {
            var parts = path.split('.'),
                depth = parts.length,
                setter = (typeof val !== "undefined") ? true : false;

            return parts.reduce(function (o, key, i) {
                if (setter && (i + 1) === depth) {
                    if (typeof o[key] === "object" && typeof val === "object") {
                        Object.assign(o[key], val);
                    } else {
                        o[key] = val;
                    }
                }
                return key in o ? o[key] : {};
            }, obj);
        },
        _convertNameToState: function (name) {
            return name.replace("_", ".").split("-").reduce(function (result, value) {
                return result + value.charAt(0).toUpperCase() + value.substring(1);
            });
        },
        detachListeners: function () {
            $(".controls").off("click", "button.stop");
            $(".controls .reader-config-group").off("change", "input, select");
        },
        // applySetting: function (setting, value) {
        //     var track = Quagga.CameraAccess.getActiveTrack();
        //     if (track && typeof track.getCapabilities === 'function') {
        //         switch (setting) {
        //             case 'zoom':
        //                 return track.applyConstraints({ advanced: [{ zoom: parseFloat(value) }] });
        //             case 'torch':
        //                 return track.applyConstraints({ advanced: [{ torch: !!value }] });
        //         }
        //     }
        // },
        setState: function (path, value) {
            var self = this;

            if (typeof self._accessByPath(self.inputMapper, path) === "function") {
                value = self._accessByPath(self.inputMapper, path)(value);
            }

            if (path.startsWith('settings.')) {
                var setting = path.substring(9);
                return self.applySetting(setting, value);
            }
            self._accessByPath(self.state, path, value);

            console.log(JSON.stringify(self.state));
            App.detachListeners();
            Quagga.stop();
            App.init();
        },
        inputMapper: {
            inputStream: {
                constraints: function (value) {
                    if (/^(\d+)x(\d+)$/.test(value)) {
                        var values = value.split('x');
                        return {
                            width: { min: parseInt(values[0]) },
                            height: { min: parseInt(values[1]) }
                        };
                    }
                    return {
                        deviceId: value
                    };
                }
            },
            numOfWorkers: function (value) {
                return parseInt(value);
            },
            decoder: {
                readers: function (value) {
                    if (value === 'ean_extended') {
                        return [{
                            format: "ean_reader",
                            config: {
                                supplements: [
                                    'ean_5_reader', 'ean_2_reader'
                                ]
                            }
                        }];
                    }
                    return [{
                        format: value + "_reader",
                        config: {}
                    }];
                }
            }
        },
        state: {
            inputStream: {
                type: "LiveStream",
                constraints: {
                    width: { min: 1280 },
                    height: { min: 720 },
                    facingMode: "environment",
                    aspectRatio: { min: 1, max: 2 }
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: 1,
            frequency: 10,
            decoder: {
                readers: [{
                    format: "code_128_reader",
                    config: {}
                }]
            },
            locate: true
        },
        lastResult: null
    };

    App.init();

    // drawing boxes 
    Quagga.onProcessed(function (result) {
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
            }
        }
    });

    Quagga.onDetected(function (result) {
        var code = result.codeResult.code;

        //alston. ALLOW SAME RESULTS
        // if (App.lastResult !== code) {
        App.lastResult = code;
        var $node = null, canvas = Quagga.canvas.dom.image;

        $node = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');
        // $node.find("img").attr("src", canvas.toDataURL());
        $node.find("h4.code").html(code);
        // console.log(code);
        detected_result = code;
        $("#result_strip ul.thumbnails").prepend($node);
        // }
    });

});


/*
Following scripts were created by Alston Lantian X. on 10 Nov 2020
Some functions were contirbuted by Hugo and Kexin
*/

let addBlockBtn, endBtn, clearBtn, langBtn;
let mainSeq = "";

var notes = [60, 62, 64, 65, 67, 69, 71, 72];
var osc;

var rawSplit;
var rawSplitSt = [];
var note = [], duration = [], volume = [], melodySeq = [];
let testSeq = [];

let trigger = 0;
let index = 0;
let autoplay = false;
let detectIntervalAddlock = 0;
let detectInterval = 0
let detectIntervalVI = 0;

var addnewblock = false;

window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var o = null;
var g = null;
let VI_CH = false;
let VI_EN = true;
var bufferLoader;

var convertedSeq = "";
let cat_branch = false;
let heart_branch = false;
let thunder_branch = false;
let moon_branch = false;
let sun_branch = false;
let star_branch = false;
let branchOneScanned = false;
let ct_str = "", ht_str = "", th_str = "", mn_str = "", sn_str = "", sr_str = "";
let error_exist = false;
let error_msg = "";
let clear = true;
let BLOCKS_DETECTED = 0;

// let testPath = "VI/EN/LS.mp3";
var source = null;
var audioBuffer_EN = [];
var audioBuffer_CH = [];

let seqPlayed = false;


InitAllVIs();
function setup() {
    // var w = window.innerWidth;
    // console.log("innerWidth " + w);
    createCanvas(windowWidth, windowHeight - 400);
    background(240);

    // A triangle oscillator
    osc = new p5.TriOsc();
    // Start silent
    osc.start();
    osc.amp(0);

    addBlockBtn = createButton('ADD BLOCK\n新增');
    addBlockBtn.position(windowWidth * 0.1, 340);
    addBlockBtn.size(windowWidth * 0.38, 80);
    addBlockBtn.style('font-size', '12px');
    addBlockBtn.mousePressed(Addnewblocks);

    endBtn = createButton('PLAY 播放');
    endBtn.position(windowWidth * 0.52, 390);
    endBtn.size(windowWidth * 0.38, 30);
    endBtn.style('font-size', '12px');
    endBtn.mousePressed(PrintSeq);

    clearBtn = createButton('CLEAR 清空');
    clearBtn.position(windowWidth * 0.52, 340);
    clearBtn.size(windowWidth * 0.38, 30);
    clearBtn.style('font-size', '12px');
    clearBtn.mousePressed(ClearInput);


    langBtn = createButton('EN/中');
    langBtn.position(windowWidth * 0.75, windowHeight - 180);
    langBtn.size(windowWidth * 0.15, 30);
    langBtn.style('font-size', '10px');
    langBtn.mousePressed(ChangeVILan);
}

function draw() {

    if (clear) {
        background(240);
        textSize(15);
        textAlign(CENTER);
        textStyle(BOLD);
        text("Please Scan Blocks To Start\n請掃描條形碼", 0, 10, windowWidth);
    }

    //detect new block after 3 secs
    if (detected_result != "" && !addnewblock) {
        let isnum = /^\d+$/.test(detected_result);
        if (isnum) {
            let testNote = Number(String(detected_result).charAt(0));
            let testDur = Number(String(detected_result).charAt(1));
            // TestSound(testNote, testDur);
            if (millis() > detectInterval) {
                detectInterval = millis() + 3000;
                TestSound(testNote, testDur);
            }
            detected_result = "";
        } else {
            if (millis() > detectIntervalVI) {
                detectIntervalVI = millis() + 3000;
                DescriSound(detected_result);
                detected_result = "";
            } else {
                //dispose detected result if neither a note nor funciton block
                detected_result = "";
            }
        }
    } else if (detected_result != "" && addnewblock) {
        if (millis() > detectIntervalAddlock) {
            detectIntervalAddlock = millis() + 3000;
            background(240);
            textSize(15);
            textAlign(RIGHT);
            textStyle(NORMAL);
            text("Last Detected:\n掃描結果： " + detected_result, -10, 10, windowWidth);
            console.log("Added: " + detected_result);
            textAlign(LEFT);
            textSize(15);
            text("Blocks Detected:\n已掃描數量：" + BLOCKS_DETECTED, 10, 10, windowWidth);
            ReadNewBlock();
        }
    }

    if (!error_exist) {
        if (note != 0) {
            //alston. here is to play the whole seq
            if (autoplay && millis() > trigger) {
                PlayNote(note[index], duration[index]);
                trigger = millis() + duration[index];
                // console.log(trigger);
                index++;
            } else if (index >= note.length) {
                autoplay = false;
                index = 0;
            }
        }
    } else {
        background(240);
        textSize(13);
        textAlign(CENTER);
        textStyle(BOLD);
        text("Error: " + error_msg, 0, 10, windowWidth);
    }

    textSize(15);
    textAlign(CENTER);
    textStyle(BOLD);
    text("MEI Lab @SCM", 0, windowHeight - 440, windowWidth);
}


function InitAllVIs() {
    let CH_dir = [], EN_dir = [];
    CH_dir = ['VI/CH/LS.mp3', 'VI/CH/LE2.mp3', 'VI/CH/LE3.mp3', 'VI/CH/LE4.mp3', 'VI/CH/LE5.mp3', 'VI/CH/SSCT.mp3', 'VI/CH/SSHT.mp3', 'VI/CH/SSMN.mp3', 'VI/CH/SSSN.mp3', 'VI/CH/SSSR.mp3', 'VI/CH/SSTH.mp3', 'VI/CH/SE.mp3', 'VI/CH/CTB.mp3', 'VI/CH/HTB.mp3', 'VI/CH/MNB.mp3', 'VI/CH/SNB.mp3', 'VI/CH/SRB.mp3', 'VI/CH/THB.mp3', 'VI/CH/Error.mp3'];
    EN_dir = ['VI/EN/LS.mp3', 'VI/EN/LE2.mp3', 'VI/EN/LE3.mp3', 'VI/EN/LE4.mp3', 'VI/EN/LE5.mp3', 'VI/CH/SSCT.mp3', 'VI/EN/SSHT.mp3', 'VI/EN/SSMN.mp3', 'VI/EN/SSSN.mp3', 'VI/EN/SSSR.mp3', 'VI/EN/SSTH.mp3', 'VI/EN/SE.mp3', 'VI/EN/CTB.mp3', 'VI/EN/HTB.mp3', 'VI/EN/MNB.mp3', 'VI/EN/SNB.mp3', 'VI/EN/SRB.mp3', 'VI/EN/THB.mp3', 'VI/EN/Error.mp3'];

    for (i = 0; i < CH_dir.length; i++) {
        LoadSoundFile(CH_dir[i], 'CH', i);
    }
    for (i = 0; i < EN_dir.length; i++) {
        LoadSoundFile(EN_dir[i], 'EN', i);
    }
}

//following three functions are must for use on iOS platforms.
function LoadSoundFile(url, LANG, index) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function (e) {
        InitAudioVI(this.response, LANG, index);
    };
    xhr.send();
}

function InitAudioVI(arrayBuffer, LANG, index) {
    switch (LANG) {
        case ('CH'):
            context.decodeAudioData(arrayBuffer, function (buffer) {
                audioBuffer_CH[index] = buffer;
            }, function (e) {
                console.log('Error decoding file', e);
            });
            break;
        case ('EN'):
            context.decodeAudioData(arrayBuffer, function (buffer) {
                audioBuffer_EN[index] = buffer;
            }, function (e) {
                console.log('Error decoding file', e);
            });
            break;
    }
}

function PlaySound(LANG, index) {
    source = context.createBufferSource();
    if (LANG == 'CH') {
        source.buffer = audioBuffer_CH[index];
    } else if (LANG == 'EN') {
        source.buffer = audioBuffer_EN[index];
    }
    // source.loop = false;
    source.connect(context.destination);
    source.start(0);
}

function ReadNewBlock() {
    if (addnewblock) {
        if (seqPlayed == false) {
            mainSeq = mainSeq + " " + detected_result;
            addnewblock = false;
            clear = false;
        }
        else {
            ChangeBranchTBP();
            addnewblock = false;
            clear = false;
        }
    }
}

//only works after the seq has been played
function ChangeBranchTBP() {
    console.log("changing branch...");
    if (detected_result.includes("B")) {
        note = [];
        duration = [];
        melodySeq = [];
        if (cat_branch) {
            mainSeq = mainSeq.replace("CTB", detected_result);
        } else if (heart_branch) {
            mainSeq = mainSeq.replace("HTB", detected_result);
        } else if (thunder_branch) {
            mainSeq = mainSeq.replace("THB", detected_result);
        } else if (moon_branch) {
            mainSeq = mainSeq.replace("MNB", detected_result);
        } else if (sun_branch) {
            mainSeq = mainSeq.replace("SNB", detected_result);
        } else if (star_branch) {
            mainSeq = mainSeq.replace("SRB", detected_result);
        }
        console.log("Seq changed to: " + mainSeq);
        ResetBranch();
        switch (detected_result) {
            case ("CTB"):
                cat_branch = true;
                break;
            case ("HTB"):
                heart_branch = true;
                break;
            case ("THB"):
                thunder_branch = true;
                break;
            case ("MNB"):
                moon_branch = true;
                break;
            case ("SNB"):
                sun_branch = true;
                break;
            case ("SRB"):
                star_branch = true;
                break;
        }
    }
}

function ClearInput() {
    ResetBranch();
    mainSeq = "";
    convertedSeq = "";
    detected_result = "";
    ct_str = "";
    ht_str = "";
    th_str = "";
    mn = "";
    sn_st = "";
    sr_str = "";
    note = [];
    duration = [];
    melodySeq = [];
    clear = true;
    error_exist = false;
    seqPlayed = false;
    BLOCKS_DETECTED = 0;
    console.log("Cleared!")
}

function Convert() {
    if (mainSeq != "") {
        console.log("Scanned Blocks: " + mainSeq);
        console.log("Converted: " + convertedSeq);
    }
    if (!convertedSeq) {
        ERRORS(3);
    } else {
        if (!convertedSeq.includes("(")) {
            rawSplitSt = split(convertedSeq, " ");
            for (var i = 0; i < rawSplitSt.length; i++) {
                if (rawSplitSt[i].includes("CT") || rawSplitSt[i].includes("HT") || rawSplitSt[i].includes("TH") || rawSplitSt[i].includes("MN") || rawSplitSt[i].includes("SN") || rawSplitSt[i].includes("SR")) {
                    DetectSwitch(rawSplitSt[i]);
                } else {
                    rawSplit = int(rawSplitSt[i]);
                    GetSeq(rawSplit);
                }
            }
        }
        else {
            raw = ConvertMethod2(convertedSeq);
            rawSplitSt = split(raw, " ");
            for (var i = 0; i < rawSplitSt.length; i++) {
                if (rawSplitSt[i].includes("CT") || rawSplitSt[i].includes("HT") || rawSplitSt[i].includes("TH") || rawSplitSt[i].includes("MN") || rawSplitSt[i].includes("SN") || rawSplitSt[i].includes("SR")) {
                    DetectSwitch(rawSplitSt[i]);
                } else {
                    rawSplit = int(rawSplitSt[i]);
                    GetSeq(rawSplit);
                }
            }
        }
        if (!error_exist && note != 0) {
            console.log("PLAYED : " + melodySeq.length + " Notes.");
        }
        // print("OUTPUTS: ");
        // for (var i = 0; i < melodySeq.length; i++) {
        //   print(melodySeq[i]);
        // }
    }
}

//Kexin recursively process the string
function ConvertMethod2(str) {
    var bIndex = [];
    var repeatIdx = [];
    var nestloopIdx = [];
    var outputStr;
    var appendStr = [];
    var hasNest = false;
    //find position of ()
    // print(str.length);
    for (var i = 0; i < str.length; i++) {
        var theChar = str.charAt(i);
        if (theChar == '(') {
            if (!str.includes(")")) {
                ERRORS(1);
            } else {
                bIndex.push(i);
                var contains = false;
                for (var j = i + 1; j < str.length; j++) {
                    if (str.charAt(j) == '(') {
                        contains = true;
                    }
                    else if (str.charAt(j) == ')') {
                        if (contains) { contains = false; if (!nestloopIdx.includes(i)) nestloopIdx.push(i); hasNest = true; }
                        else {
                            bIndex.push(j);
                            repeatIdx.push(str.charAt(j + 1));
                            i = j + 1;
                            break;
                        }
                    }
                }
            }
        }
    }

    if (bIndex[0] > 0) appendStr.push(str.substring(0, bIndex[0]));
    for (var i = 0; i < bIndex.length; i = i + 2) {
        //if(hasNest){
        if (nestloopIdx.includes(bIndex[i])) {
            var loopStr = ProcessLoop(str.substring(bIndex[i] + 1, bIndex[i + 1]), repeatIdx[i / 2]);
            appendStr.push(ConvertMethod2(loopStr));
        }
        else {
            // var loopStr = ProcessLoop(str.substring(bIndex[i] + 1, bIndex[i + 1]), repeatIdx[i / 2]);
            var loopStr = ProcessLoop(str.substring(bIndex[i] + 1, bIndex[i + 1]), repeatIdx[i / 2]);
            // print(loopStr);
            appendStr.push(loopStr);
        }
        if (i + 2 < bIndex.length) appendStr.push(str.substring(bIndex[i + 1] + 3, bIndex[i + 2]));//if have other () behind
        else if (bIndex[i + 1] + 3 < str.length) appendStr.push(str.substring(bIndex[i + 1] + 3, str.length));
    }
    // for (var i = 0; i < appendStr.length; i++) {
    //   print("brackets: " + appendStr[i]);
    // }

    outputStr = appendStr.join("");
    // print(outputStr);
    return outputStr;
}

//Kexin repeat the loop string
function ProcessLoop(loopStr, repeatTime) {
    var outputStr;
    var appendStr = [];
    for (var i = 0; i < repeatTime; i++) {
        appendStr.push(loopStr);
    }
    outputStr = appendStr.join();
    return outputStr;
}

//alston. the following functions are for switch functions. 
function DetectSwitch(branchID) {
    //alston. not using "else if" in case switches don't come in pair 20201105
    switch (branchID) {
        case ("CT"):
            if (ct_str != "" && cat_branch) {
                InsertSwitch(ct_str);
            } else {
                console.log("No cat branch OR Cat branch not selected!");
            }
            break;
        case ("HT"):
            if (ht_str != "" && heart_branch) {
                InsertSwitch(ht_str);
            } else {
                console.log("No heart branch OR Heart branch not selected!");
            }
            break;
        case ("TH"):
            if (th_str != "" && thunder_branch) {
                InsertSwitch(th_str);
            } else {
                console.log("No thunder branch OR Thunder branch not selected!");
            }
            break;
        case ("MN"):
            if (mn_str != "" && moon_branch) {
                InsertSwitch(mn_str);
            } else {
                console.log("No moon branch OR Moon branch not selected!");
            }
            break;
        case ("SN"):
            if (sn_str != "" && sun_branch) {
                InsertSwitch(sn_str);
            } else {
                console.log("No sun branch OR Sun branch not selected!");
            }
            break;
        case ("SR"):
            if (sr_str != "" && star_branch) {
                InsertSwitch(sr_str);
            } else {
                console.log("No star branch OR Star branch not selected!");
            }
            break;
    }
}

function InsertSwitch(str) {
    var strSplit = [];
    var intSplit;

    if (!str.includes("(")) {
        strSplit = split(str, " ");
        for (var i = 0; i < strSplit.length; i++) {
            intSplit = int(strSplit[i]);
            GetSeq(intSplit);
        }
    }
    else {
        str = ConvertMethod2(str);
        strSplit = split(str, " ");
        // printArray(strSplit);
        for (var i = 0; i < strSplit.length; i++) {
            intSplit = int(strSplit[i]);
            GetSeq(intSplit);
        }
    }

}

//alston. the following functions are for playing note sequence.
function GetSeq(digits) {
    volume.push(100);
    let noteDur, noteCode;
    noteDur = int(digits % 10);
    noteCode = int(digits / 10);
    switch (noteDur) {
        case (1): duration.push(300); break;
        case (2): duration.push(600); break;
        case (3): duration.push(900); break;
        // case (4): duration.push(1200); break;
    }
    switch (noteCode) {
        case (1): note.push(261.63); melodySeq.push(1); break;
        case (2): note.push(293.67); melodySeq.push(2); break;
        case (3): note.push(329.63); melodySeq.push(3); break;
        case (4): note.push(349.23); melodySeq.push(4); break;
        case (5): note.push(392.00); melodySeq.push(5); break;
    }
}

function TestSound(inputNote, inputDur) {
    let freq = 0, dur = 0;
    switch (inputNote) {
        case (1): freq = 261.63; break;
        case (2): freq = 293.67; break;
        case (3): freq = 329.63; break;
        case (4): freq = 349.23; break;
        case (5): freq = 392.00; break;
    }
    switch (inputDur) {
        case (1): dur = 300; break;
        case (2): dur = 600; break;
        case (3): dur = 900; break;
    }
    PlayNote(freq, dur);
}

function PrintSeq() {
    DetectBlock(mainSeq);
    Convert();
    if (!error_exist) {
        for (var i = 0; i < note.length; i++) {
            console.log(note[i] + " " + duration[i]);
        }
        autoplay = true;
    }
    // mainSeq = "";
    convertedSeq = "";
    note = [];
    duration = [];
    melodySeq = [];
    seqPlayed = true;
    //alston. playing seq is conducted inside draw()
}

function PlayNote(frequency, dur) {
    o = context.createOscillator();
    g = context.createGain();
    o.type = 'sine';
    o.connect(g);
    o.frequency.value = frequency;
    g.connect(context.destination);
    g.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + dur / 1000);
    o.start(0);

}

function DetectBlock(scanned_str) {
    let split_str = scanned_str.split(" ");
    const block_amount = split_str.length;

    for (i = 1; i < block_amount; i++) {
        if (split_str[i].includes("SS") || split_str[i].includes("SE")) {
            if (split_str[i].includes("SS")) {
                let branch_index = split_str[i].slice(2, 4);
                // let input_index = mainSeq.indexOf("SS" + branch_index);
                // console.log("index: " + input_index);
                switch (branch_index) {
                    case ("CT"):
                        ct_str = ExtractSwitchSeq(branch_index);
                        break;
                    case ("HT"):
                        ht_str = ExtractSwitchSeq(branch_index);
                        break;
                    case ("TH"):
                        th_str = ExtractSwitchSeq(branch_index);
                        break;
                    case ("MN"):
                        mn_str = ExtractSwitchSeq(branch_index);
                        break;
                    case ("SN"):
                        sn_str = ExtractSwitchSeq(branch_index);
                        break;
                    case ("SR"):
                        sr_str = ExtractSwitchSeq(branch_index);
                        break;
                    default:
                        ERRORS(4);
                }
                i = split_str.indexOf("SE", i);
            }
        } else if (split_str[i].includes("B")) {
            switch (split_str[i]) {
                case ("CTB"):
                    cat_branch = true;
                    break;
                case ("HTB"):
                    heart_branch = true;
                    break;
                case ("THB"):
                    thunder_branch = true;
                    break;
                case ("MNB"):
                    moon_branch = true;
                    break;
                case ("SNB"):
                    sun_branch = true;
                    break;
                case ("SRB"):
                    star_branch = true;
                    break;
            }
        } else {
            convertedSeq = convertedSeq + " " + split_str[i];
        }
    }

}

function ResetBranch() {
    cat_branch = false;
    heart_branch = false;
    thunder_branch = false;
    moon_branch = false;
    sun_branch = false;
    star_branch = false;
}

function Addnewblocks() {
    addnewblock = true;
    BLOCKS_DETECTED++;
}

function ERRORS(errorCode) {
    switch (errorCode) {
        case (0):
            error_msg = "Branch blocks are not in pair!\nPlease scan barcode on the blocks again.\n分支模塊不匹配，請重新掃描！";
            error_exist = true;
            break;
        case (1):
            error_msg = "Loop blocks are not in pair!\nPlease scan barcode on the blocks again.\n循環體不完整，請重新掃描！";
            error_exist = true;
            break;
        case (2):
            error_msg = "Empty Switch/Loop Blocks!\n請重新掃描！";
            error_exist = true;
            break;
        case (3):
            error_msg = "No detected blocks!\n模塊空缺，請重新掃描！";
            error_exist = true;
            break;
        case (4):
            error_msg = "No branch is selected!\n請選擇分支！";
            error_exist = true;
            break;
    }
    let LANG = '';
    if (VI_EN) {
        LANG = 'EN'
    } else if (VI_CH) {
        LANG = 'CH';
    }
    PlaySound(LANG, 18);
}


function ExtractSwitchSeq(searchID) {
    var startID = "SS" + searchID;
    var endID = "SE";
    var switchStartIndex = mainSeq.indexOf(startID) + 5;
    var switchEndIndex = mainSeq.indexOf(endID, switchStartIndex) - 2;
    if (switchEndIndex < 0) {
        ERRORS(0);
    }
    var switchStr = mainSeq.slice(switchStartIndex, switchEndIndex + 1);
    convertedSeq = convertedSeq + " " + String(searchID);

    return switchStr;
}


function ChangeVILan() {
    if (VI_CH) {
        VI_CH = false;
        VI_EN = true;
        console.log("Language for Voice Instructions changed to English.")
    } else if (VI_EN) {
        VI_CH = true;
        VI_EN = false;
        console.log("Language for Voice Instructions changed to Cantonese.")
    }
}

function DescriSound(inputStr) {
    let LANG = '';
    if (VI_EN) {
        LANG = 'EN'
    } else if (VI_CH) {
        LANG = 'CH';
    }
    if (inputStr.includes("(")) {
        PlaySound(LANG, 0);
    } else if (inputStr.includes(")")) {
        let itr = inputStr.charAt(1);

        switch (itr) {
            case ("2"):
                //twice
                PlaySound(LANG, 1);
                break;
            case ("3"):
                //three times
                PlaySound(LANG, 2);
                break;
            case ("4"):
                PlaySound(LANG, 3);
                break;
            case ("5"):
                console.log(itr);
                PlaySound(LANG, 4);
                break;
        }

    } else if (inputStr.includes("SS")) {
        let index = inputStr.slice(2, 4);
        switch (index) {
            case ("CT"):
                PlaySound(LANG, 5);
                break;
            case ("HT"):
                PlaySound(LANG, 6);
                break;
            case ("MN"):
                PlaySound(LANG, 7);
                break;
            case ("SN"):
                PlaySound(LANG, 8);
                break;
            case ("SR"):
                PlaySound(LANG, 9);
                break;
            case ("TH"):
                PlaySound(LANG, 10);
                break;
        }
    } else if (inputStr.includes("SE")) {
        PlaySound(LANG, 11);
    } else if (inputStr.includes("B")) {
        let selectedBranch = inputStr.slice(0, 2);
        switch (selectedBranch) {
            case ("CT"):
                PlaySound(LANG, 12);
                break;
            case ("HT"):
                PlaySound(LANG, 13);
                break;
            case ("MN"):
                PlaySound(LANG, 14);
                break;
            case ("SN"):
                PlaySound(LANG, 15);
                break;
            case ("SR"):
                PlaySound(LANG, 16);
                break;
            case ("TH"):
                PlaySound(LANG, 17);
                break;
        }
    }
}
