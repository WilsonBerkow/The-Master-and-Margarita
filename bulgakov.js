(function () {
    'use strict';
    var canvas = $('#game')[0],
        ctx = canvas.getContext('2d'),
        canvasWidth = 576,
        canvasHeight = 1024,
        fps = 50;
    var makeObject = function (proto, props) {
        var o = Object.create(proto);
        Object.keys(props).forEach(function (prop) {
            o[prop] = props[prop];
        });
        return o;
    };
    var square = function (x) { return x * x; };
    var dist = function (x0, y0, x1, y1) {
        return Math.sqrt(square(x1 - x0) + square(y1 - y0));
    };
    var rand256 = function () { return Math.floor(Math.random() * 256); };
    var rgb = function (r, g, b) { return "rgb(" + r + "," + g + "," + b + ")"; };
    var mkSkinTone = function (lightnessPcnt) {
        return "hsl(24, 71.4%, " + lightnessPcnt + "%)";
    };
    var randSkinTone = function () {
        return mkSkinTone(Math.round(Math.random() * 30 + 50));
    };
    var callWith = function () {
        var args = [].slice.apply(arguments);
        return function (f) {
            return f.apply(null, args);
        };
    };
    var apply = function (that, args) {
        return function (f) {
            return f.apply(that, args);
        };
    };
    var invoke = callWith();
    var testRange = function (min, x, max) {
        return min <= x && x <= max;
    };
    var randElem = function (arr) {
        var i = Math.floor(Math.random() * arr.length);
        return arr[i];
    };
    var randInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };
    var Pt = function (x, y) { return {x: x, y: y}; };
    var shapes = { // General-purpose renderers for shapes
        circle: function (ctx, x, y, radius) {
            ctx.moveTo(x, y);
            ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
        },
        polyline: function (ctx, points) {
            if (points.length < 2) { return; }
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(function (pt) {
                ctx.lineTo(pt.x, pt.y);
            });
        },
        line: function (ctx, x0, y0, x1, y1) {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
        },
        rounded: function (ctx, x, y, width, height, radius, paintStyle) { // Thank you, Juan Mendes (this code was viciously stolen from <http://js-bits.blogspot.com/2010/07/canvas-rounded-corner-rectangles.html>, with slight modification).
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx[paintStyle]();
        }
    };
    var genericRender = {
        stageWithCurtains: function (ctx) {
            var shadeColor = "#034";//"#404";
            var lightColor = "#067";//"#707";
            var heights = [canvasHeight * 0.45, canvasHeight * 0.45 + 20], i, h; // Heights of the curtain bottoms
            ctx.fillStyle = "navy"; // For the wall
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.fillStyle = "rgb(238, 154, 73)";
            ctx.fillRect(0, heights[0], canvasWidth, canvasHeight * 0.4);
            ctx.fillStyle = "rgb(139, 90, 43)";
            ctx.fillRect(0, heights[0] + canvasHeight * 0.4, canvasWidth, 40);
            // Curtain:
            ctx.beginPath();
            for (i = 0; i * 50 < canvasWidth; i += 2) {
                shapes.polyline(ctx, [Pt(i * 50, heights[0]), Pt(i * 50 + 50, heights[1]), Pt(i * 50 + 50, 0), Pt(i * 50, 0)]);
            }
            ctx.fillStyle = shadeColor;
            ctx.fill();
            ctx.beginPath();
            for (i = 1; i * 50 < canvasWidth; i += 2) {
                shapes.polyline(ctx, [Pt(i * 50, heights[1]), Pt(i * 50 + 50, heights[0]), Pt(i * 50 + 50, 0), Pt(i * 50, 0)]);
            }
            ctx.fillStyle = lightColor;
            ctx.fill();
        },
        infoTexter: function (ctx, text, width, height) {
            ctx.font = "70px corbel";
            ctx.strokeStyle = "lightblue";
            ctx.lineWidth = 6;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeText(text, canvasWidth / 2, canvasHeight / 18, width, height);
            ctx.strokeStyle = "black"; // To minimize state changes, I'm doing this once, here, rather than using .save(),.restore(), bla bla bla and changing the state variables everywhere
        },
        timeLeftBar: function (ctx, fractionLeft) {
            ctx.fillStyle = "#55b";
            ctx.fillRect(0, 0, canvasWidth * fractionLeft, 10);
        }
    };
    var people = {
        randFaceDims: function (width) {
            return {
                width: (Math.round(Math.random() * 5) + (width || 37)) * 3,
                heightFactor: Math.random() * 0.5 + 1
            };
        },
        faceDims: function (style) {
            if (style === "fat") {
                return {
                    width: (Math.round(Math.random() * 4) + 40) * 3,
                    heightFactor: Math.random() * 0.4 + 0.9
                };
            }
            if (style === "thin") {
                return {
                    width: (Math.round(Math.random() * 4) + 35) * 3,
                    heightFactor: Math.random() * 0.4 + 1.1
                };
            }
            return randFaceDims();
        },
        randFaceChars: function (width) {
            var faceDims = people.randFaceDims();
            return {
                width: faceDims.width,
                heightFactor: faceDims.heightFactor,
                skinClr: randSkinTone(),
                eyesClr: "hsl(" + Math.floor(Math.random() * 360) + ", 70%, 70%)",
                eyesHeightFactor: Math.random() * 0.5 + 0.75,
                mouthStyle: randElem(Object.keys(people.render.mouths))
            };
        },
        randTorsoChars: function (skinClr) {
            return {
                clothesClr: rgb(rand256(), rand256(), rand256()),
                skinClr: skinClr || randSkinTone()
            };
        },
        happyMouthStyle: function () {
            return randElem(["teethy", ":D", ":)"]);
        },
        smilingMouthStyle: function () {
            return randElem([":D", ":)"]);
        },
        obnoxiousMouthStyle: function () {
            return "teethy";
        },
        mehMouthStyle: function () {
            return randElem([":|", ":l"]);
        },
        render: { // General-purpose renderers for people
            eye: function (ctx, x, y, width, heightFactor, color, pupilFraction) {
                var wRad = width / 2, hCtrlRad = width * heightFactor; // hCtrlRad is the elevation of the ctrl point of the quadratic curve of the sclera's edge.
                pupilFraction = pupilFraction || 0.4;
                // Sclera:
                ctx.beginPath();
                ctx.moveTo(x - wRad, y);
                ctx.quadraticCurveTo(x, y - hCtrlRad / 2, x + wRad, y);
                ctx.quadraticCurveTo(x, y + hCtrlRad / 2, x - wRad, y);
                ctx.fillStyle = 'beige';
                ctx.fill();
                // Iris:
                ctx.beginPath();
                shapes.circle(ctx, x, y, hCtrlRad / 4 - 1);
                ctx.fillStyle = color;
                ctx.fill();
                // Pupil:
                ctx.beginPath();
                shapes.circle(ctx, x, y, hCtrlRad / 4 * pupilFraction);
                ctx.fillStyle = 'black';
                ctx.fill();
            },
            face: function (ctx, person, x, y) {
                var eyeWidth, wRad, height;
                var chars = person.isFace ? person : { // The condition allows use of the face function without the data for the full person.
                    width: person.head.faceWidth,
                    heightFactor: person.head.faceHeightFactor,
                    skinClr: person.skinClr,
                    leftEyeClr: person.leftEyeClr || person.eyesClr,
                    rightEyeClr: person.rightEyeClr || person.eyesClr,
                    eyesHeightFactor: person.eyesHeightFactor,
                    mouthStyle: person.head.mouthStyle
                };
                var x = x || person.head.x, y = y || person.head.y;
                wRad = chars.width / 2;
                height = chars.width * chars.heightFactor;
                eyeWidth = wRad * 0.8;
                // Face upper half:
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.arc(x, y, wRad, 0, Math.PI, true);
                ctx.fillStyle = chars.skinClr;
                ctx.fill();
                // Face lower "half":
                ctx.beginPath();
                ctx.moveTo(x + wRad, y);
                ctx.bezierCurveTo(x + wRad * 0.7, y + height * 0.6,
                                  x - wRad * 0.7, y + height * 0.6,
                                  x - wRad, y);
                ctx.fillStyle = chars.skinClr;
                ctx.fill();
                // Eyes:
                people.render.eye(ctx, x - wRad / 2 + 1, y - 2, eyeWidth, chars.eyesHeightFactor, chars.leftEyeClr || chars.eyesClr);
                people.render.eye(ctx, x + wRad / 2 - 1, y - 2, eyeWidth, chars.eyesHeightFactor, chars.rightEyeClr || chars.eyesClr);
                // Nose:
                ctx.beginPath();
                shapes.circle(ctx, x - 2, y + wRad * 0.33, 2);
                shapes.circle(ctx, x + 2, y + wRad * 0.33, 2);
                ctx.fill();
                // Mouth:
                people.render.mouths[chars.mouthStyle](ctx, x, y + wRad * 0.7, wRad / 2);
            },
            mouths: {
                ":|": function (ctx, x, y, width) {
                    var wRad = width / 2;
                    ctx.beginPath();
                    ctx.moveTo(x - wRad / 2, y); // TODOOOOOOOOOOO!!!!!!! (DO A BUNCH OF UNDOS TO GET TO WHERE THIS FN IS BACK UP IN // Mouth: DIRECTLY
                    ctx.lineTo(x + wRad / 2, y);
                    ctx.stroke();
                },
                ":l": function (ctx, x, y, width) {
                    var wRad = width / 2;
                    ctx.beginPath();
                    ctx.moveTo(x - wRad, y);
                    ctx.lineTo(x + wRad * 0.67, y);
                    ctx.lineTo(x + wRad, y - wRad / 3);
                    ctx.lineWidth = 3;
                    ctx.stroke();
                },
                ":D": function (ctx, x, y, width) {
                    var wRad = width / 2, hRad = wRad / 3;
                    ctx.beginPath();
                    ctx.moveTo(x - wRad, y - hRad);
                    ctx.quadraticCurveTo(x, y + 2 * hRad, x + wRad, y - hRad);
                    ctx.fill();
                },
                ":)": function (ctx, x, y, width) {
                    var wRad = width / 2, hRad = wRad / 3;
                    ctx.beginPath();
                    ctx.moveTo(x - wRad, y - hRad);
                    ctx.quadraticCurveTo(x, y + 2 * hRad, x + wRad, y - hRad);
                    ctx.stroke();
                },
                "teethy": (function () {
                    var startShape = function (x, y, wRad) {
                        ctx.beginPath();
                        ctx.moveTo(x - wRad, y);
                        ctx.lineTo(x + wRad * 1.1, y - wRad / 2);
                        ctx.lineTo(x + wRad * 1.0, y + wRad / 4);
                        ctx.closePath();
                    };
                    var vertLine = function (x, absY, yDiff, yOffset) {
                        ctx.moveTo(x, absY - yDiff - yOffset);
                        ctx.lineTo(x, absY + yDiff - yOffset);
                    };
                    return function (ctx, x, y, width) {
                        var wRad = width / 2;
                        startShape(x, y, wRad);
                        ctx.fillStyle = "white";
                        ctx.fill();
                        startShape(x, y, wRad);
                        shapes.line(ctx, x - wRad, y, x + wRad * 1.05, y - wRad / 6);
                        vertLine(x - wRad *  1.0, y, wRad * 0.03, wRad * 0.01);
                        vertLine(x - wRad *  0.5, y, wRad * 0.05, wRad * 0.01);
                        vertLine(x - wRad *  0.0, y, wRad * 0.18, wRad * 0.01);
                        vertLine(x - wRad * -0.5, y, wRad * 0.28, wRad * 0.035);
                        vertLine(x - wRad * -0.9, y, wRad * 0.35, wRad * 0.06);
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    };
                }())
            },
            torso: function (ctx, person) {//x, y, torsoChars) {
                // TODO: suited-up, scraggly, sailor, vampire?, gondolier, etc.
                // TODO: implement something to have these identifying char.s on the ppl too (perhaps more than just facial expressions)
                var x = person.torso.x, y = person.torso.y;
                ctx.fillStyle = person.skinClr;
                ctx.fillRect(x - 10, y, 20, 10);
                ctx.fillStyle = person.clothesClr;
                ctx.fillRect(x - 50, y + 10, 100, 300);
            },
            randPerson: function () {
                // TODO: accumulate chars for the person as a whole, to then be used in construction of face, accessories, and torso
            }
        }
    };
    var mainMenu = (function () {
        var titleClr0 = "#505";
        var titleClr1 = "#202"; // Or, "#ddd";
        var wolandFaceChars = {
            isFace: true,
            width: 180,
            heightFactor: 1.6,
            skinClr: mkSkinTone(75),
            leftEyeClr: "brown",
            rightEyeClr: "green",
            eyesHeightFactor: 0.8,
            mouthStyle: ":l" // TODO: Make special skirm expression (e.g. the right half of a parabola)
        };
        var render = {
            background: genericRender.stageWithCurtains,
            woland: function (ctx) {
                var cx = canvasWidth * 0.2;
                var cy = canvasHeight * 0.3;
                var faceWRad = wolandFaceChars.width / 2;
                var apxFaceHRad = wolandFaceChars.width * wolandFaceChars.heightFactor / 3;
                var shouldersRad = faceWRad * 1.33;
                var shouldersHeight = faceWRad * 1.26;
                // TORSO, BLACK BODY OF SUIT-JACKET BODY:
                ctx.beginPath();
                ctx.moveTo(cx - faceWRad / 2, cy + apxFaceHRad);
                ctx.lineTo(cx - shouldersRad, cy + shouldersHeight);
                ctx.lineTo(cx - shouldersRad + 20, cy + shouldersHeight + 300);
                ctx.lineTo(cx + shouldersRad - 20, cy + shouldersHeight + 300);
                ctx.lineTo(cx + shouldersRad, cy + shouldersHeight);
                ctx.lineTo(cx + faceWRad / 2, cy + apxFaceHRad);
                ctx.fillStyle = "#0f0f0f";
                ctx.fill();
                // WHITE SHIRT OF SUIT:
                var factor = 0.5;
                ctx.beginPath();
                ctx.moveTo(cx - faceWRad / 2, cy + apxFaceHRad);
                ctx.lineTo(cx - shouldersRad * factor, cy + shouldersHeight * 0.91);
                ctx.lineTo(cx, cy + shouldersHeight + 210);
                //ctx.lineTo(cx + shouldersRad * factor - 20, cy + shouldersHeight + 300);
                ctx.lineTo(cx + shouldersRad * factor, cy + shouldersHeight * 0.91);// * 0.7);
                ctx.lineTo(cx + faceWRad / 2, cy + apxFaceHRad);
                ctx.fillStyle = "white";
                ctx.fill();
                // DARKER LINES OF SUIT FOLD TRIANGLE THINGS:
                ctx.beginPath();
                // Left triangle:
                ctx.moveTo(cx - shouldersRad * factor + 7, cy + shouldersHeight * 0.91 - 5);
                ctx.lineTo(cx - shouldersRad * factor - 30, cy + shouldersHeight * 0.91 + 18);
                ctx.lineTo(cx, cy + shouldersHeight + 210 + 20);
                // Right triangle:
                ctx.lineTo(cx + shouldersRad * factor + 30, cy + shouldersHeight * 0.91 + 18);
                ctx.lineTo(cx + shouldersRad * factor - 7, cy + shouldersHeight * 0.91 - 5);
                ctx.lineTo(cx, cy + shouldersHeight + 210); // This connects the shape (not really 2 triangles, but actually a concave hexigon) to the tip of the triangle of visibility of his white shirt.
                ctx.fillStyle = "black";
                ctx.fill();
                // FACE:
                ctx.strokeStyle = "black";
                people.render.face(ctx, wolandFaceChars, cx, cy);
            },
            title: (function () {
                var doWords = function (drawer) {
                    ctx.lineWidth = 3;
                    ctx.font = "210px BlessedDay";
                    drawer("The", canvasWidth * 0.0, canvasHeight * 0.275);
                    drawer("Master", canvasWidth * 0.3, canvasHeight * 0.315);
                    ctx.font = "220px BlessedDay";
                    drawer("and", canvasWidth * 0.7, canvasHeight * 0.390);
                    ctx.font = "170px BlessedDay";
                    drawer("Margarita", canvasWidth * 0.25, canvasHeight * 0.46);
                };
                return function (ctx) {
                    ctx.save(); // In this case, it is worth it
                    ctx.fillStyle = titleClr0;
                    ctx.fontWeight = "bold";
                    ctx.fontAlign = "center";
                    ctx.textBaseline = "alphabetic";
                    doWords(function () { return ctx.fillText.apply(ctx, [].slice.apply(arguments)); });
                    ctx.strokeStyle = titleClr1;
                    doWords(function () { return ctx.strokeText.apply(ctx, [].slice.apply(arguments)); });
                    ctx.restore();
                };
            }()),
            button: (function () {
                var lightClr = "#ffc27b";
                var darkClr = "#bd905b";
                return function (ctx, btn) {
                    ctx.save();
                    ctx.fillStyle = btn.isDown ? lightClr : darkClr; // To make clicks visible
                    shapes.rounded(ctx, btn.x + 6, btn.y + 6, btn.width, btn.height, 15, "fill");
                    ctx.fillStyle = btn.isDown ? darkClr : lightClr;
                    shapes.rounded(ctx, btn.x, btn.y, btn.width, btn.height, 15, "fill");
                    ctx.strokeStyle = btn.isDown ? lightClr : darkClr;
                    ctx.fontWeight = "bold";
                    ctx.textBaseline = "middle";
                    ctx.textAlign = "center";
                    ctx.lineWidth = 7;
                    ctx.strokeText(btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2 - 4);//30, y - 8);
                    ctx.restore();
                };
            }())
        };
        var mkBtn = (function () {
            var proto = {
                draw: function (ctx) {
                    render.button(ctx, this.x, this.y, this.width, this.height, this.text);
                },
                coversPoint: function (x, y) {
                    console.log("Ranges to test:\n  " + this.x + " <= " + x + " <= " + (this.x + this.width) + "\nand\n  " +
                                                        this.x + " <= " + y + " <= " + (this.y + this.height));
                    return testRange(this.x, x, this.x + this.width) &&
                           testRange(this.y, y, this.y + this.height);
                }
            };
            return function (x, y, width, height, text) {
                var btn = makeObject(proto, {
                    x: x, // O ES6, so powerfully you beckon to me...
                    y: y, // But we are kept apart, by those oldies on XP.
                    width: width,
                    height: height,
                    text: text,
                    isDown: false
                });
                return btn;
            };
        }());
        var run = function (ctx) {
            var playBtn = mkBtn(284, 550, 200, 80, "Play");
            var storyBtn = mkBtn(280, 660, 210, 80, "Story");
            var execFrame = function () {
                render.background(ctx);
                render.woland(ctx);
                render.title(ctx);
                ctx.font = "70px corbel";
                render.button(ctx, playBtn);
                render.button(ctx, storyBtn);
            };
            var intervalId = setInterval(execFrame, 1000 / fps);
            var cleanUp = function () { // To be executed when the menu is exited
                clearInterval(intervalId);
                jQuery(document).off(".mainMenu");
            };
            jQuery(document).on("mousedown.mainMenu", function (event) {
                if (playBtn.coversPoint(event.pageX, event.pageY)) {
                    console.log("in first if");
                    playBtn.isDown = true;
                }
                if (storyBtn.coversPoint(event.pageX, event.pageY)) {
                    storyBtn.isDown = true;
                }
            });
            jQuery(document).on("mouseup.mainMenu", function (event) {
                playBtn.isDown = false;
                storyBtn.isDown = false;
            });
            jQuery(document).on("click.mainMenu", function (event) {
                if (playBtn.coversPoint(event.pageX, event.pageY)) {
                    cleanUp();
                    headsGame.play(ctx, function () {}, function () {});
                }
                if (storyBtn.coversPoint(event.pageX, event.pageY)) {
                    // TODO: IMPLEMENT STORY PAGE
                }
            });
        };
        return {
            render: render,
            run: run
        };
    }());
    var headsGame = (function () {
        var timeGiven = 2500;
        var render = {
            background: function (ctx) {
                return genericRender.stageWithCurtains(ctx);
            },
            infoText: function (ctx) {
                return genericRender.infoTexter(ctx, "   Match the heads back to their bodies!   ", canvasWidth, 24);
            },
            severedNeckUpper: function (ctx, faceChars) {
                // TODO: Paint the bloody neck
            },
            severedHead: function (ctx, head) {
                // TODO: Paint the face and the severed head, and anything else (e.g. lil bit of clothing?)
            },
            severedNeckLower: function (ctx, color) {
                // TODO: Paint the lower half of the severed neck (the one to be connected with the torso)
            },
            severedTorso: function (ctx, torso) {
                // TODO: Paint the severed lower neck, and the torso
            }
        };
        var play = (function () {
            var faceWidth = 140, headsY = 200, headsTargetY = 450;
            var pos3ToX = function (pos) {
                return canvasWidth / 4 * (pos + 1);
            };
            var mkRandPosPtrns = (function () {
                var posPatterns = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 1, 0], [2, 0, 1]];
                return function () {
                    return randElem(posPatterns);
                };
            }());
            var personIsMatched = function (person) { return person.head.matched; };
            var mkPerson = (function () {
                var proto = {
                    // These need to be separate for proper layering:
                    drawFace: function (ctx) {
                        people.render.face(ctx, this);
                    },
                    drawTorso: function (ctx) {
                        people.render.torso(ctx, this);
                    }
                };
                var headProto = {
                    coversPoint: function (x, y) {
                        return dist(x, y, this.x, this.y) < this.faceWidth / 2; // TODO: THIS IS APPROXIMATE
                    },
                    resetPos: function () {
                        this.x = this.origX;
                        this.y = this.origY;
                    },
                    atTarget: function () {
                        return this.matched || this.coversPoint(this.targetX, this.targetY);
                    },
                    handleReachTarget: function () {
                        this.matched = true;
                        this.dragging = false;
                        this.x = this.targetX;
                        this.y = this.targetY;
                    }
                };
                return function (chars) {
                    // TODO: INPUT VALIDATION FOR WHEN I FUCK UP
                    var person = makeObject(proto, chars);
                    person.head = makeObject(headProto, person.head);
                    return person;
                };
            }());
            var roles = ["rich", "fat", "tux", "poor"];//, "sailor"]; // fat can be a fat american guy
            var mkRandPerson = function (facePos, torsoPos) {
                var faceDims;
                var guy = {
                    head: {
                        x: pos3ToX(facePos),
                        y: headsY,
                        // origX, origY, targetX, targetY (All added below)
                        dragging: false,
                        matched: false
                        // mouthStyle: ...
                        // faceWidth: ... (These are added)
                        // faceHeightFactor: ...
                    },
                    torso: {
                        x: pos3ToX(torsoPos),
                        y: headsTargetY
                    },
                    skinClr: randSkinTone(),
                    eyesClr: "hsl(" + Math.floor(Math.random() * 360) + ", 70%, 70%)",
                    eyesHeightFactor: Math.random() * 0.5 + 0.75,
                    role: randElem(roles)
                };
                guy.head.origX = guy.head.x;
                guy.head.origY = guy.head.y;
                guy.head.targetX = guy.torso.x;
                guy.head.targetY = guy.torso.y;
                if (guy.role === "rich") {
                    guy.head.mouthStyle = people.obnoxiousMouthStyle();
                    faceDims = people.faceDims("thin");
                } else if (guy.role === "fat") {
                    guy.head.mouthStyle = people.smilingMouthStyle();
                    faceDims = people.faceDims("fat");
                } else if (guy.role === "tux") {
                    guy.head.mouthStyle = people.happyMouthStyle();
                    faceDims = people.randFaceDims();
                } else if (guy.role === "poor") {
                    guy.head.mouthStyle = people.mehMouthStyle();
                    faceDims = people.randFaceDims();
                }
                guy.head.faceWidth = faceDims.width;
                guy.head.faceHeightFactor = faceDims.heightFactor;
                return mkPerson(guy);
            };
            return function (handleWin, handleLoss) {
                var prevTime = Date.now() - 1000 / fps, dt; // Subtract from prevTime to give dt a reasonable starting value.
                var startTime = Date.now();
                var gameSt = {
                    persons: []
                };
                var persons = gameSt.persons;
                (function () { // Especially ugly, so I kinda wanna contain it
                    var takenFacePoses = [false, false, false];
                    var takenTorsoPoses = [false, false, false];
                    [0, 1, 2].forEach(function () {
                        var fPos, tPos;
                        if (persons.length === 0) {
                            fPos = randInt(0, 2);
                            tPos = randInt(0, 2);
                        } else {
                            fPos = takenFacePoses.indexOf(false); // TODO: special case for (persons len = 2) for more randomness
                            tPos = takenTorsoPoses.indexOf(false);
                        }
                        persons.push(mkRandPerson(fPos, tPos));
                        takenFacePoses[fPos] = true;
                        takenTorsoPoses[tPos] = true;
                    });
                }());
                var execFrame = function () {
                    var now = Date.now();
                    dt = now - prevTime;
                    prevTime = now;
                    
                    var timeElapsed = now - startTime;
                    
                    render.background(ctx);
                    genericRender.timeLeftBar(ctx, (timeGiven - timeElapsed) / timeGiven);
                    render.infoText(ctx);
                    persons.forEach(function (person) { person.drawTorso(ctx); });
                    persons.forEach(function (person) { person.drawFace(ctx); });
                    
                    if (timeElapsed > timeGiven) {
                        youLose();
                        return;
                    }
                    if (persons.every(personIsMatched)) {
                        youWin();
                        return;
                    }
                }
                var intervalId = setInterval(execFrame, 1000 / fps);
                jQuery(document).on("mousedown", function (event) {
                    var i, head;
                    for (i = 0; i < persons.length; i += 1) {
                        head = persons[i].head;
                        if (head.coversPoint(event.pageX, event.pageY)) { // TODO: DONT USE PAGEX AND PAGEY (ESP NOT DIRECTLY)
                            head.dragging = true;
                            return;
                        }
                    }
                });
                jQuery(document).on("mouseup", function () {
                    var i, head;
                    for (i = 0; i < persons.length; i += 1) {
                        head = persons[i].head;
                        if (head.dragging) {
                            head.dragging = false;
                            head.resetPos();
                        }
                    }
                });
                jQuery(document).on("mousemove", function (event) {
                    var i, head;
                    for (i = 0; i < persons.length; i += 1) {
                        head = persons[i].head;
                        if (head.dragging) { // TODO: DONT USE PAGEX AND PAGEY (ESP NOT DIRECTLY)
                            head.x = event.pageX;
                            head.y = event.pageY;
                            if (head.atTarget()) {
                                head.handleReachTarget();
                            }
                            return;
                        }
                    }
                });
                var youWin = function () {
                    clearInterval(intervalId);
                    handleWin(execFrame, gameSt);
                };
                var youLose = function () {
                    clearInterval(intervalId);
                    //var finalAnimationInterval = setInterval(function () {
                    //    // TODO: BLOOD EVERYWHERE, thennn run handleLoss below, from the callback
                    //}, 1000 / framerate);
                    handleLoss(execFrame, gameSt);
                };
            };
        }());
        return {render: render, play: play};
    }());
    //headsGame.play(function () {alert("Horray!"); }, function () {alert("Oh noes!"); });
    mainMenu.run(ctx);
}());