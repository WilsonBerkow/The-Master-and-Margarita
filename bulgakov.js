(function () {
    'use strict';
    var canvas = jQuery("#game")[0],
        ctx = canvas.getContext("2d"),
        overlayCanvas = jQuery("#overlay0")[0],
        overlayCtx = overlayCanvas.getContext("2d"),
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
    var modulo = function (num, modBy) {
        return num > modBy ? modulo(num - modBy, modBy) :
               num < 0 ? modulo(num + modBy, modBy) :
               num;
    };
    (function () { // Thank you hammer.github.io, I'm using this as a little hack to prevent scrolling.
        var mc = Hammer(document.documentElement);
        // let the pan gesture support all directions.
        // this will block the vertical scrolling on a touch-device while on the element
        mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    }());
    var handleTouchend;
    (function () { // Simple Touch system, similar to Elm's but compatible with the Platfm interface
        var curTouch = null;
        var touchesCount = 0;
        jQuery("canvas").on("mousemove touchmove", function (event) {
            var xy = calcTouchPos(event);
            if (curTouch !== null) {
                curTouch.x1 = xy.x;
                curTouch.y1 = xy.y;
            }
            event.preventDefault(); // Stops the swipe-to-move-through-browser-history feature in Chrome from interferring.
        });
        jQuery("canvas").on("mousedown touchstart", function (event) {
            var now = Date.now(), xy = calcTouchPos(event);
            curTouch = {
                "t0": now,
                "id": touchesCount,
                "x0": xy.x,
                "y0": xy.y,
                "x1":  xy.x,
                "y1":  xy.y
            };
            touchesCount += 1;
        });
        jQuery("canvas").on("mouseup touchend", function () {
            if (typeof handleTouchend === "function" && curTouch) {
                handleTouchend(curTouch);
            }
            curTouch = null;
            // Do not use preventDefault here, it prevents
            // triggering of the 'tap' event.
        });
    }());
    var calcTouchPos = (function () {
        var pageScaleFactor = 1,
            moduleOffsetX = 0,
            windowDims = {
                "width": window.innerWidth || document.documentElement.clientWidth, // The defaulting expression (.documentElement....) is for IE
                "height": window.innerHeight || document.documentElement.clientHeight
            },
            htmlModule = document.getElementById("container"),
            resize = function () { // This zooms the page so that the Firecyclist rectangle (initially always (576/2) by (1024/2) in dimensions), fits to the page.
                var scaleX = windowDims.width / canvasWidth,
                    scaleY = windowDims.height / canvasHeight,
                    unfitAxis;
                pageScaleFactor = Math.min(scaleX, scaleY);
                unfitAxis = pageScaleFactor === scaleX ? "y" : "x";
                document.body.setAttribute("style", [ // Using document.body.style[property] didn't work, but just using setAttribute is fine here as this is the only style that will ever be applied.
                    "-moz-transform-origin: 0 0",
                    "-moz-transform: scale(" + pageScaleFactor + ")",
                    "-webkit-transform-origin: 0 0",
                    "-webkit-transform: scale(" + pageScaleFactor + ")",
                    "-ms-transform-origin: 0 0",
                    "-ms-transform: scale(" + pageScaleFactor + ")"
                ].join("; "));
                if (unfitAxis === "x") {
                    moduleOffsetX = ((windowDims.width - canvasWidth * pageScaleFactor) / 2) / pageScaleFactor; // The last division, by pageScaleFactor, is there because the zoom done above will automatically scale this whole expression/offest by pageScaleFactor, so the division undoes that.
                    htmlModule.setAttribute("style", "position: fixed; left: " + Math.floor(moduleOffsetX) + "px;");
                }
            };
        resize();
        return function (event) {
            return Pt((typeof event.clientX === "number" ? event.clientX : event.originalEvent.changedTouches[0].clientX) / pageScaleFactor - moduleOffsetX,
                      (typeof event.clientY === "number" ? event.clientY : event.originalEvent.changedTouches[0].clientY) / pageScaleFactor);
        };
    }());
    var eventX = function (event) { return calcTouchPos(event).x; };
    var eventY = function (event) { return calcTouchPos(event).y; };
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
    var constFn = function (x) { return function () { return x; }};
    var testRange = function (min, x, max) {
        return min <= x && x <= max;
    };
    var closedInterval = function (min, max) {
        var interval = function (x) {
            return testRange(min, x, max);
        };
        interval.min = min;
        interval.max = max;
        return inverval;
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
        semicircle: function (ctx, x, y, radius) {
            ctx.moveTo(x, y);
            ctx.arc(x, y, radius, 0, Math.PI, true);
        },
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
        roundedRectPath: function (ctx, x, y, width, height, radius) { // Thank you, Juan Mendes (this code was viciously stolen from <http://js-bits.blogspot.com/2010/07/canvas-rounded-corner-rectangles.html>, with slight modification).
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
        },
        rounded: function (ctx, x, y, width, height, radius, paintStyle) {
            ctx.beginPath();
            shapes.roundedRectPath(ctx, x, y, width, height, radius);
            ctx[paintStyle]();
        }
    };
    // The following are used in both mainMenu and youLoseScreen
    var titleClr0 = "#500";//"#505";
    var titleClr1 = "#d99";//"#a6a";//"#900";//"#200";//"#202"; // Or, "#ddd";
    var mkBtn = (function () {
        var proto = {
            draw: function (ctx) {
                genericRender.button(ctx, this);
            },
            coversPoint: function (x, y) {
                return testRange(this.x, x, this.x + this.width) &&
                       testRange(this.y, y, this.y + this.height);
            }
        };
        return function (x, y, width, height, text) {
            var btn = makeObject(proto, {
                x: x, // O ES6, how you're sweat, syntax sugar beckons to me...
                y: y, // Alas, our love is forbidden, by those oldies on XP.
                width: width,
                height: height,
                text: text,
                isDown: false
            });
            return btn;
        };
    }());
    var genericRender = {
        clear: function (ctx) {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        },
        stageWithCurtains: function (ctx) {
            var shadeColor = "#404";//"#034";
            var lightColor = "#707";//"#067";
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
        },
        scriptText: function (ctx, x, y, alignment, size, text, font, reverse) { // TODO: USE IN TITLE FUNCTION IN MAINMENU
            ctx.lineWidth = 5;
            ctx.textAlign = alignment;
            ctx.font = size + " " + (font || "BlessedDay");
            ctx.strokeStyle = reverse ? titleClr1 : titleClr0;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = reverse ? titleClr0 : titleClr1;
            ctx.fillText(text, x, y);
        },
        button: (function () {
            var lightClr = "#ffc27b";
            var midClr = "#efb26b";
            var darkClr = "#bd905b";
            return function (ctx, btn) {
                var upperXOffset = btn.isDown ? 6 : 0;
                var upperYOffset = btn.isDown ? 6 : 0;
                ctx.save();
                ctx.fillStyle = btn.isDown ? lightClr : darkClr; // To make clicks visible
                shapes.rounded(ctx, btn.x + 6, btn.y + 6, btn.width, btn.height, 15, "fill");
                if (!btn.isDown) {
                    ctx.fillStyle = btn.isDown ? midClr : lightClr;
                    shapes.rounded(ctx, btn.x + upperXOffset, btn.y + upperYOffset, btn.width, btn.height, 15, "fill");
                }
                ctx.strokeStyle = darkClr;
                ctx.fontWeight = "bold";
                ctx.textBaseline = "middle";
                ctx.textAlign = "center";
                ctx.lineWidth = 7;
                ctx.strokeText(btn.text, btn.x + btn.width / 2 + upperXOffset, btn.y + btn.height / 2 - 4 + upperYOffset);
                ctx.restore();
            };
        }())
    };
    var infoOverlay = (function () {
        var clr = "rgba(255, 255, 255, 0.75)";
        var render = {
            clear: function (ctx) {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            },
            blurBg: function (ctx) {
                ctx.fillStyle = clr;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            },
            infoText: function (ctx, text) {
                ctx.strokeStyle = "#444";
                ctx.font = "30px corbel";
                ctx.textAlign = "center";
                ctx.lineWidth = 3;
                text.split("\n").forEach(function (line, i) {
                    ctx.strokeText(line, canvasWidth / 2, canvasHeight * 0.2 + 33 * i);
                });
            },
            stdText: function (ctx) {
                ctx.strokeStyle = "#666"; // Lawdy lawd the end is he-a
                ctx.font = "55px corbel";
                ctx.textAlign = "center";
                ctx.lineWidth = 6;
                ctx.strokeText("Tap to Continue", canvasWidth / 2, canvasHeight * 0.7);
            }
        };
        return function (message, handleFinish) {
            render.clear(overlayCtx);
            render.blurBg(overlayCtx);
            render.infoText(overlayCtx, message);
            render.stdText(overlayCtx);
            var cleanUp = function () {
                jQuery("canvas").off(".infoOverlay");
                render.clear(overlayCtx);
            };
            jQuery("canvas").on("tap.infoOverlay click.infoOverlay", function () {
                cleanUp();
                handleFinish();
            });
        };
    }());
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
        randFaceChars: (function () {
            var acceptableMouths = null;
            return function (width) {
                if (!acceptableMouths) {
                    acceptableMouths = Object.keys(people.render.mouths);
                    acceptableMouths.splice(acceptableMouths.indexOf("behemoth"), 1); // Behemoth's mouth is for Behemoth only
                }
                var faceDims = people.randFaceDims();
                return {
                    width: faceDims.width,
                    heightFactor: faceDims.heightFactor,
                    skinClr: randSkinTone(),
                    eyesClr: "hsl(" + Math.floor(Math.random() * 360) + ", 70%, 70%)",
                    eyesHeightFactor: Math.random() * 0.5 + 0.75,
                    mouthStyle: randElem(Object.keys(people.render.mouths))
                };
            };
        }()),
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
            faceOutline: function (ctx, width, hFactor, x, y) {
                // TODO:!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
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
                ctx.moveTo(x, y + 1);
                ctx.arc(x, y + 1, wRad, 0, Math.PI, true);
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
                }()),
                "behemoth": (function () {
                    var wheelAt = (function () {
                        var sines = [],   // Sine and cosine tables are used so that the approximation work doesn't
                            cosines = [], // have to be done more than once for any given angle. The angles of the
                                          // spokes are rounded down to the nearest degree.
                                          // TODO: Extract these tables and use them for as many other uses of
                                          //  Math.sin and Math.cos as possible.
                            oneDegree = Math.PI / 180,
                            i,
                            getSin = function (radians) {
                                return sines[modulo(Math.floor(radians / oneDegree), 360)];
                            },
                            getCos = function (radians) {
                                return cosines[modulo(Math.floor(radians / oneDegree), 360)];
                            };
                        for (i = 0; i < 360; i += 1) {
                            sines[i] = Math.sin(i * oneDegree);
                            cosines[i] = Math.cos(i * oneDegree);
                        }
                        return function (ctx, x, y, angle, mouthRad) {
                            var i;
                            shapes.circle(ctx, x, y, mouthRad);
                            var spokeAngle = 0, spinOffset = angle * oneDegree, relX, relY;
                            for (i = 0; i < 6; i += 1) {
                                relX = getCos(spinOffset + spokeAngle) * mouthRad;
                                relY = getSin(spinOffset + spokeAngle) * mouthRad;
                                ctx.moveTo(x + relX, y + relY);
                                ctx.lineTo(x - relX, y - relY);
                                if (i !== 5) {
                                    spokeAngle += 1/3 * Math.PI;
                                }
                            }
                        };
                    }());
                    return function (ctx, x, y, width) {
                        var wRad = width / 2 - 3;
                        ctx.beginPath();
                        shapes.circle(ctx, x, y, wRad);
                        ctx.fillStyle = "white";
                        ctx.fill();
                        ctx.beginPath();
                        wheelAt(ctx, x, y, 4, wRad);
                        ctx.lineWidth = 6;
                        ctx.strokeStyle = streetcarGame.render.behemothBlack;
                        ctx.stroke();
                    };
                }())
            },
            torso: function (ctx, person) {//x, y, torsoChars) {
                // TODO: suited-up, scraggly, sailor, vampire?, gondolier, etc.
                // TODO: implement something to have these identifying char.s on the ppl too (perhaps more than just facial expressions)
                var x = person.torso.x, y = person.torso.y;
                var wRad = person.head.faceWidth * 3 / 5;
                var shoulderRadius = 50;
                ctx.fillStyle = person.skinClr;
                ctx.fillRect(x - 20, y, 40, 10);
                ctx.fillStyle = person.clothesClr;
                shapes.rounded(ctx, x - wRad, y + 10, 2 * wRad, 350, shoulderRadius, "fill");
            },
            randPerson: function () {
                // TODO: accumulate chars for the person as a whole, to then be used in construction of face, accessories, and torso
            }
        }
    };
    var mainMenu = (function () {
        var wolandFaceChars = {
            isFace: true,
            width: 180,
            heightFactor: 1.6,
            skinClr: mkSkinTone(75),
            leftEyeClr: "#4F1F02",
            rightEyeClr: "green",
            eyesHeightFactor: 0.8,
            mouthStyle: ":l" // TODO: Make special skirm expression (e.g. the right half of a parabola)
        };
        var render = {
            background: genericRender.stageWithCurtains,
            woland: function (ctx, cx, cy) {
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
                ctx.fillStyle = "#333";
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
                // TIE:
                ctx.fillStyle = "#333";
                ctx.beginPath();
                ctx.moveTo(cx + faceWRad / 5, cy + shouldersHeight + 10);
                ctx.lineTo(cx - faceWRad / 5, cy + shouldersHeight + 10);
                ctx.lineTo(cx, cy + shouldersHeight + 35);
                ctx.fill();
                ctx.moveTo(cx + 2, cy + shouldersHeight - 15);
                ctx.lineTo(cx + faceWRad / 3, cy + shouldersHeight + 15 + 210);
                ctx.lineTo(cx, cy + shouldersHeight + 15 + 210 + 20);
                ctx.lineTo(cx - faceWRad / 3, cy + shouldersHeight + 15 + 210);
                ctx.lineTo(cx - 3, cy + shouldersHeight - 15);
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
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.moveTo(cx - 15, cy + shouldersHeight);
                ctx.lineTo(cx + 15, cy + shouldersHeight);
                ctx.lineTo(cx + 10, cy + shouldersHeight + 13);
                ctx.lineTo(cx - 10, cy + shouldersHeight + 13);
                ctx.fill();
                // FACE SIDE HAIR:
                ctx.beginPath();
                ctx.arc(cx, cy, faceWRad - 1, Math.PI, 0);
                ctx.strokeStyle = "black";
                ctx.lineWidth = 4;
                ctx.stroke();
                // FEDORA:
                // Fill:
                ctx.beginPath();
                ctx.moveTo(cx + faceWRad * 1.1, cy - 20);
                ctx.lineTo(cx + faceWRad * 1.1, cy - 25);
                ctx.lineTo(cx + faceWRad * 0.98, cy - 25);
                ctx.lineTo(cx + faceWRad * 0.6, cy - 20 - faceWRad * 1);
                ctx.lineTo(cx, cy - 20 - faceWRad + 19)
                ctx.lineTo(cx - faceWRad * 0.6, cy - 20 - faceWRad * 1);
                ctx.lineTo(cx - faceWRad * 0.98, cy - 20);
                ctx.lineTo(cx - faceWRad * 1.1, cy - 25);
                ctx.lineTo(cx - faceWRad * 1.1, cy - 25);
                ctx.fillStyle = "#444";
                ctx.fill();
                // Slightly darker outline:
                ctx.beginPath();
                ctx.moveTo(cx + faceWRad * 1.1, cy - 20);
                ctx.lineTo(cx + faceWRad * 1.1, cy - 25);
                ctx.lineTo(cx + faceWRad * 0.98, cy - 25);
                ctx.lineTo(cx + faceWRad * 0.6, cy - 20 - faceWRad * 1);
                ctx.lineTo(cx, cy - 20 - faceWRad + 19)
                ctx.lineTo(cx - faceWRad * 0.6, cy - 20 - faceWRad * 1);
                ctx.lineTo(cx - faceWRad * 0.98, cy - 20);
                ctx.lineTo(cx - faceWRad * 1.1, cy - 25);
                ctx.lineTo(cx - faceWRad * 1.1, cy - 25);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#3a3a3a";
                ctx.stroke();
                ctx.fillStyle = "#333";
                ctx.fillRect(cx - faceWRad * 1.1325, cy - 35, faceWRad * 2.265, 14);
                ctx.fillStyle = "#555";
                ctx.fillRect(cx - faceWRad * 0.925, cy - 49, faceWRad * 1.85, 14);
            },
            title: (function () {
                var doWords = function (offset, drawer) {
                    ctx.lineWidth = 5;
                    ctx.textAlign = "left";
                    ctx.font = "210px BlessedDay";
                    drawer("The",    canvasWidth * 0.0 + offset, canvasHeight * 0.275 + offset);
                    drawer("Master", canvasWidth * 0.3 + offset, canvasHeight * 0.315 + offset);
                    ctx.font = "220px BlessedDay";
                    drawer("and", canvasWidth * 0.7 + offset, canvasHeight * 0.390 + offset);
                    ctx.font = "170px BlessedDay";
                    drawer("Margarita", canvasWidth * 0.25 + offset, canvasHeight * 0.46 + offset);
                };
                return function (ctx) {
                    ctx.save(); // In this case, it is worth it
                    ctx.fillStyle = titleClr0;
                    ctx.fontWeight = "bold";
                    ctx.fontAlign = "center";
                    ctx.textBaseline = "alphabetic";
                    ctx.strokeStyle = titleClr1;
                    doWords(0, function () { return ctx.strokeText.apply(ctx, [].slice.apply(arguments)); });
                    doWords(0, function () { return ctx.fillText.apply(ctx, [].slice.apply(arguments)); });
                    ctx.restore();
                };
            }())
        };
        var goToLoseScreen = function (execFrame, gameSt, msg, score) {
            youLoseScreen.run(msg, score);
        };
        var goToWinScreen = function (execFrame, gameSt, msg, score) {
            youWinScreen.run(msg, score);
        };
        var firstTimeRunning = true;
        var run = function () {
            var playBtn = mkBtn(284, 550, 200, 80, "Play");
            var storyBtn = mkBtn(290, 660, 188, 80, "Help");
            var slidingInStarted = !firstTimeRunning;
            if (!firstTimeRunning) {
                var translationAmt = 0;
                ctx.translate(576, 0);
            } else {
                firstTimeRunning = false;
            }
            var execFrame = function () {
                if (slidingInStarted && translationAmt < 576) {
                    ctx.translate(-96, 0);
                    translationAmt += 96;
                }
                render.background(ctx);
                render.woland(ctx, canvasWidth * 0.2, canvasHeight * 0.3);
                render.title(ctx);
                ctx.font = "70px corbel";
                playBtn.draw(ctx);
                storyBtn.draw(ctx);
            };
            var intervalId = setInterval(execFrame, 1000 / fps);
            var cleanUp = function () { // To be executed when the menu is exited
                clearInterval(intervalId);
                jQuery("canvas").off(".mainMenu");
            };
            jQuery("canvas").on("touchstart.mainMenu mousedown.mainMenu", function (event) {
                var x = eventX(event), y = eventY(event);
                if (playBtn.coversPoint(x, y)) {
                    playBtn.isDown = true;
                }
                if (storyBtn.coversPoint(x, y)) {
                    storyBtn.isDown = true;
                }
            });
            jQuery("canvas").on("touchend.mainMenu mouseup.mainMenu", function (event) {
                playBtn.isDown = false;
                storyBtn.isDown = false;
            });
            jQuery("canvas").on("tap.mainMenu click.mainMenu", function (event) {
                var x = eventX(event), y = eventY(event);
                if (playBtn.coversPoint(x, y)) {
                    cleanUp();
                    minigames.launch();
                }
                if (storyBtn.coversPoint(x, y)) {
                    showStoryMenu(function (game) {
                        cleanUp();
                        hideStoryMenu();
                        if (game === "headsGame") {
                            headsGame.play(goToWinScreen, goToLoseScreen, 1, true);
                        } else if (game === "shotgunGame") {
                            shotgunGame.play(goToWinScreen, goToLoseScreen, 1, true);
                        } else if (game === "streetcarGame") {
                            streetcarGame.play(goToWinScreen, goToLoseScreen, 1, true);
                        }
                    });
                }
            });
        };
        return {
            render: render,
            run: run
        };
    }());
    var showStoryMenu = (function () {
        var storyHtml = jQuery("#story");
        var run;
        jQuery('.playBtn').on('tap.storyPlayClick click.storyPlayClick', function (event) {
            var $btn = jQuery(event.target);
            var game = $btn.attr('target');
            if (run) {
                run(game);
                run = null;
            }
        });
        return function (callback) {
            storyHtml.css("display", "block");
            run = callback;
        };
    }());
    var hideStoryMenu = (function () {
        var storyHtml = jQuery("#story");
        return function (run) {
            storyHtml.css("display", "none");
        };
    }());
    var youLoseScreen = (function () {
        var render = {
            background: function (ctx) {
                genericRender.stageWithCurtains(ctx);
            },
            message: function (ctx, msg) {
                ctx.font = "34px corbel";
                ctx.fillStyle = "darkgray";
                ctx.textAlign = "center";
                var yOffset = 0;
                msg.split("\n").forEach(function (line) {
                    ctx.fillText(line, canvasWidth / 2 + 5, canvasHeight * 0.05 + yOffset);
                    yOffset += 38;
                });
            },
            title: function (ctx) {
                genericRender.scriptText(ctx, canvasWidth * 0.3, canvasHeight * 0.25,
                                         "center", "310px",
                                         "You");
                genericRender.scriptText(ctx, canvasWidth * 0.65, canvasHeight * 0.4,
                                         "center", "310px",
                                         "Lose");
            },
            score: function (ctx, score) {
                genericRender.scriptText(ctx, canvasWidth / 2, canvasHeight * 0.55,
                                         "center", "80px",
                                         "" + score,
                                         "PressStart2P");
            }
        };
        var exitBtn = mkBtn(canvasWidth / 2 - 150, canvasHeight * 0.65,
                            300, 80,
                            "Go Home");
        var run = function (msg, score) {
            console.log(score);
            msg = msg || "Woland won, so...";
            var curScore = 0;
            var translationAmt = 0;
            ctx.translate(576, 0);
            var execFrame = function () {
                if (translationAmt < 576) {
                    ctx.translate(-96, 0);
                    translationAmt += 96;
                }
                render.background(ctx);
                render.message(ctx, msg);
                render.title(ctx);
                if (typeof score === "number") {
                    render.score(ctx, Math.floor(curScore));
                }
                ctx.font = "60px arial";
                exitBtn.draw(ctx);
                if (curScore < score) {
                    curScore += score / fps; // Take 1 seconds
                } else if (curScore > score) {
                    curScore = score;
                }
            };
            var intervalId = setInterval(execFrame, 1000 / fps);
            var cleanUp = function () {
                clearInterval(intervalId);
                jQuery("canvas").off(".youLoseScreen");
            };
            jQuery("canvas").on("touchstart.youLoseScreen mousedown.youLoseScreen", function (event) {
                var xy = calcTouchPos(event);
                if (exitBtn.coversPoint(xy.x, xy.y)) {
                    exitBtn.isDown = true;
                }
            });
            jQuery("canvas").on("touchend.youLoseScreen mouseup.youLoseScreen", function (event) {
                exitBtn.isDown = false;
            });
            jQuery("canvas").on("tap.youLoseScreen click.youLoseScreen", function (event) {
                var xy = calcTouchPos(event);
                if (exitBtn.coversPoint(xy.x, xy.y)) {
                    cleanUp();
                    mainMenu.run();
                }
            });
        };
        return {render: render, run: run};
    }());
    var youWinScreen = (function () {
        var render = {
            background: function (ctx) {
                genericRender.stageWithCurtains(ctx);
            },
            message: function (ctx, msg) {
                ctx.font = "34px corbel";
                ctx.fillStyle = "darkgray";
                ctx.textAlign = "center";
                var yOffset = 0;
                msg.split("\n").forEach(function (line) {
                    ctx.fillText(line, canvasWidth / 2 + 5, canvasHeight * 0.05 + yOffset);
                    yOffset += 38;
                });
            },
            title: function (ctx) {
                genericRender.scriptText(ctx, canvasWidth * 0.38, canvasHeight * 0.23,
                                         "center", "280px",
                                         "Good", null, true);
                //genericRender.scriptText(ctx, canvasWidth * 0.16, canvasHeight * 0.38,
                //                         "left", "250px",
                //                         "For", null, true);
                genericRender.scriptText(ctx, canvasWidth * 0.43, canvasHeight * 0.37,//0.38,//0.42,
                                         "left", "250px",
                                         "Job", null, true);
            },
            score: function (ctx, score) {
                genericRender.scriptText(ctx, canvasWidth / 2, canvasHeight * 0.55,
                                         "center", "80px",
                                         "",
                                         "PressStart2P", true);
            }
        };
        var exitBtn = mkBtn(canvasWidth / 2 - 200, canvasHeight * 0.65,
                            400, 80,
                            "Return Home");
        var run = function (msg, score) {
            score = score || 14321;
            var curScore = 0;
            var translationAmt = 0;
            ctx.translate(576, 0);
            var execFrame = function () {
                if (translationAmt < 576) {
                    ctx.translate(-96, 0);
                    translationAmt += 96;
                }
                render.background(ctx);
                render.title(ctx);
                render.score(ctx, Math.floor(curScore));
                ctx.font = "60px arial";
                exitBtn.draw(ctx);
                if (curScore < score) {
                    curScore += score / (fps * 2); // Take 2 seconds
                } else if (curScore > score) {
                    curScore = score;
                }
            };
            var intervalId = setInterval(execFrame, 1000 / fps);
            var cleanUp = function () {
                clearInterval(intervalId);
                jQuery("canvas").off(".youWinScreen");
            };
            jQuery("canvas").on("touchstart.youWinScreen mousedown.youWinScreen", function (event) {
                var xy = calcTouchPos(event);
                if (exitBtn.coversPoint(xy.x, xy.y)) {
                    exitBtn.isDown = true;
                }
            });
            jQuery("canvas").on("touchend.youWinScreen mouseup.youWinScreen", function (event) {
                exitBtn.isDown = false;
            });
            jQuery("canvas").on("tap.youWinScreen click.youWinScreen", function (event) {
                var xy = calcTouchPos(event);
                if (exitBtn.coversPoint(xy.x, xy.y)) {
                    cleanUp();
                    mainMenu.run();
                }
            });
        };
        return {render: render, run: run};
    }());
    var headsGame = (function () {
        var defaultTimeGiven = 3000;
        var render = {
            background: function (ctx) {
                return genericRender.stageWithCurtains(ctx);
            },
            infoText: function (ctx) {
                return genericRender.infoTexter(ctx, "   Match the heads back to their bodies!   ", canvasWidth);
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
            var faceWidth = 140, headsY = 200, headsTargetY = 440;
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
                        this.y = this.targetY - 30;
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
            var infoOverlayMsg =
                ["Woland's retinue has cut the heads",
                 "off three good Muscovites!",
                 "",
                 "Prove his contempt wrong by putting the",
                 "heads back on the right bodies before",
                 "any serious damage is done!"
                 ].join("\n");
            var msgs = ['"They decapitated Kenny!"\n"You bastards!"',
                        "A doctor!\nSomeone call a doctor!",
                        '"Daddy, why are they dead?"\n"Because, son, you failed"'];
            var lossMsg = function () { return randElem(msgs); };
            var firstTimePlaying = true;
            return function (handleWin, handleLoss, timeGivenFactor, calledFromHelp) {
                var timeGiven = (timeGivenFactor || 1) * defaultTimeGiven;
                if (calledFromHelp) {
                    firstTimePlaying = true;
                }
                var gameSt = {
                    persons: []
                };
                var persons = gameSt.persons;
                (function () { // Especially ugly, so I kinda wanna contain it
                    var takenTorsoPoses = [false, false, false];
                    [0, 1, 2].forEach(function (facePos) {
                        var torsoPos;
                        if (persons.length === 0) {
                            torsoPos = randInt(0, 2);
                        } else if (persons.length === 1) {
                            do {
                                torsoPos = randInt(0, 2);
                            } while (takenTorsoPoses[torsoPos]);
                        } else {
                            torsoPos = takenTorsoPoses.indexOf(false);
                        }
                        persons.push(mkRandPerson(facePos, torsoPos));
                        takenTorsoPoses[torsoPos] = true;
                    });
                }());
                var intervalId; // Assigned in the callback to infoOverlay
                var startTime; // Same here
                var execFrame = function () {
                    var now = Date.now();
                    
                    var timeElapsed = now - (startTime || now);
                    
                    render.background(ctx);
                    genericRender.timeLeftBar(ctx, (timeGiven - timeElapsed) / timeGiven);
                    render.infoText(ctx);
                    persons.forEach(function (person) { person.drawTorso(ctx); });
                    persons.forEach(function (person) { person.drawFace(ctx); });
                    
                    if (timeElapsed > timeGiven) {
                        youLose(lossMsg());
                        return;
                    }
                    if (persons.every(personIsMatched)) {
                        youWin();
                        return;
                    }
                };
                var cleanUp = function () {
                    clearInterval(intervalId);
                    jQuery("canvas").off(".headsGame");
                };
                var youWin = function () {
                    var timeElapsed = Date.now() - startTime;
                    var fracTimeLeft = (timeGiven - timeElapsed) / timeGiven;
                    var score01 = fracTimeLeft * 0.8 / square(timeGivenFactor);
                    cleanUp();
                    handleWin(execFrame, gameSt, score01);
                };
                var youLose = function (msg) {
                    cleanUp();
                    //var finalAnimationInterval = setInterval(function () {
                    //    // TODO: BLOOD EVERYWHERE, thennn run handleLoss below, from the callback
                    //}, 1000 / framerate);
                    handleLoss(execFrame, gameSt, msg);
                };
                var startPlaying = function () {
                    startTime = Date.now();
                    intervalId = setInterval(execFrame, 1000 / fps);
                    jQuery("canvas").on("touchstart.headsGame mousedown.headsGame", function (event) {
                        var i, head, x = eventX(event), y = eventY(event);
                        for (i = 0; i < persons.length; i += 1) {
                            head = persons[i].head;
                            if (head.coversPoint(x, y)) { // TODO: DONT USE PAGEX AND PAGEY (ESP NOT DIRECTLY)
                                head.dragging = true;
                                return;
                            }
                        }
                    });
                    jQuery("canvas").on("touchend.headsGame mouseup.headsGame", function () {
                        var i, head;
                        for (i = 0; i < persons.length; i += 1) {
                            head = persons[i].head;
                            if (head.dragging) {
                                head.dragging = false;
                                head.resetPos();
                            }
                        }
                    });
                    jQuery("canvas").on("touchmove.headsGame mousemove.headsGame", function (event) {
                        var i, head, x = eventX(event), y = eventY(event);
                        for (i = 0; i < persons.length; i += 1) {
                            head = persons[i].head;
                            if (head.dragging) { // TODO: DONT USE PAGEX AND PAGEY (ESP NOT DIRECTLY)
                                head.x = x;
                                head.y = y;
                                if (head.atTarget()) {
                                    head.handleReachTarget();
                                }
                                return;
                            }
                        }
                    });
                };
                if (firstTimePlaying) {
                    firstTimePlaying = false;
                    genericRender.clear(ctx);
                    execFrame(); // Do it once, to render the initial image
                    infoOverlay(infoOverlayMsg, startPlaying);
                } else {
                    startPlaying();
                }
            };
        }());
        return {render: render, play: play, gameId: "heads"};
    }());
    var shotgunGame = (function () {
        var defaultTimeGiven = 2000;
        var cHRad = 30;
        var cHLineRad = 8;
        var sandStartY = canvasHeight * 0.4;
        var render = {
            background: function (ctx) {
                ctx.fillStyle = "#99e"; // The sky
                ctx.fillRect(0, 0, canvasWidth, sandStartY);
                ctx.fillStyle = "tan"; // The sand
                ctx.fillRect(0, sandStartY, canvasWidth, canvasHeight - sandStartY);
            },
            sparrow: function (ctx, x, y) {
                // TODO: ACTUAL BIRD
                ctx.fillStyle = "brown";
                ctx.beginPath();
                shapes.circle(ctx, x, y, 8);
                ctx.fill();
            },
            crossHairs: function (ctx, x, y, selected, red) {
                ctx.beginPath();
                shapes.circle(ctx, x, y, cHRad);
                shapes.line(ctx, x, y - cHRad - cHLineRad, x, y + cHRad + cHLineRad);
                shapes.line(ctx, x - cHRad - cHLineRad, y, x + cHRad + cHLineRad, y);
                ctx.strokeStyle = red ? "rgb(255, 0, 0)" :
                                  selected ? "rgb(50, 50, 150)" :
                                  "rgba(50, 50, 150, 0.5)";
                ctx.lineWidth = 5;
                ctx.stroke();
            },
            collonade: function (ctx, x, y) {
                ctx.beginPath();
                ctx.moveTo(x - 10, y + 30);
                ctx.lineTo(x + 175, y + 30);
                ctx.lineTo(x + 80.25, y);
                ctx.fillStyle = "#444";
                ctx.fill();
                ctx.fillStyle = "gray";
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(function (i) {
                    ctx.fillRect(x + i * 15, y + 30, 7.5, 60);
                });
                ctx.fillStyle = "#444";
                ctx.fillRect(x, y + 90, 165, 21);
            },
            infoText: function (ctx) {
                genericRender.infoTexter(ctx, "Shoot down Woland!", canvasWidth * 0.5);
            }
        };
        // Equation from which these are derived: y = 1 - (x - 0.38)^2
        var progressToX = function (progress) { return canvasWidth * progress; };
        var progressToY = function (progress) { return canvasHeight * (square(progress - 0.38) * 0.6 + 0.15); };
        var progressToPt = function (progress) {
            return Pt(progressToX(progress), progressToY(progress));
        };
        var mkCrossHairs = (function () {
            // ch.progress is in [0, 1], representing where in
            //  birdProgress the Cross Hairs are.
            var proto = {
                x: function () { return progressToX(this.progress); },
                y: function () { return progressToY(this.progress); },
                draw: function (ctx) {
                    render.crossHairs(ctx, this.x(), this.y(), this.active);
                },
                sparrowDraw: function (ctx) {
                    // For when it's not actually a crosshairs, but the sparrow
                    //  moving on the same path.
                    render.sparrow(ctx, this.hit ? this.fallFwdX : this.x(), this.hit ? this.fallHeight : this.y());
                },
                sparrowIsOver: function (obj) {
                    var objx = typeof obj.x === "function" ? obj.x() : obj.x;
                    var objy = typeof obj.y === "function" ? obj.y() : obj.y;
                    return dist(this.x(), this.y(), objx, objy) < cHRad;
                }
            };
            return function (progress, moving) {
                var ownprops = moving ? {}
                                      : {x: constFn(progressToX(progress)),
                                         y: constFn(progressToY(progress))};
                ownprops.progress = progress;
                ownprops.active = false;
                return makeObject(proto, ownprops);
            };
        }());
        var infoOverlayMsg =
            ["Woland's become a sparrow, and",
             "he's on his way to the collonade",
             "to spy on Pilate and Yeshua!",
             "",
             "Tap to shoot him down while you can!"
             ].join("\n");
        var firstTimePlaying = true;
        var play = (function () {
            var ch0P = 0.2, ch1P = 0.4, ch2P = 0.8;
            var eachBeforeIsInactive = function (chs, i) {
                for (i = i - 1; i > 0; i -= 1) {
                    if (chs[i].active) {
                        return false;
                    }
                }
                return true;
            };
            var msgs = ["He's gotten to the collonade!",
                        "He'll hear Pilate and Yeshua!",
                        "The devil knows how to aim this gun..."];
            var randMsg = function () { return randElem(msgs); };
            return function (handleWin, handleLoss, timeGivenFactor, calledFromHelp) {
                var timeGiven = (timeGivenFactor || 1) * defaultTimeGiven;
                if (calledFromHelp) {
                    firstTimePlaying = true;
                }
                var gameSt = {
                    birdProgress: 0 // in interval [0, 1]
                };
                var staticCHs = [mkCrossHairs(ch0P, false),
                                 mkCrossHairs(ch1P, false),
                                 mkCrossHairs(ch2P, false)];
                var sparrow = mkCrossHairs(0, true);
                var cleanUp = function () {
                    clearInterval(intervalId);
                    jQuery("canvas").off(".shotgunGame");
                };
                var youLose = function (msg) {
                    cleanUp();
                    return handleLoss(execFrame, gameSt, msg);
                };
                var youWin = function () {
                    var timeElapsed = Date.now() - startTime;
                    var fracTimeLeft = (timeGiven - timeElapsed) / timeGiven;
                    var score01 = fracTimeLeft * 0.5 / square(timeGivenFactor);
                    cleanUp();
                    handleWin(execFrame, gameSt, score01);
                };
                var startTime;
                var intervalId;
                var execFrame = function () {
                    var now = Date.now();
                    var timeElapsed = now - (startTime || now);
                    
                    render.background(ctx);
                    render.collonade(ctx, canvasWidth - 80, sandStartY - 70);
                    genericRender.timeLeftBar(ctx, 1 - sparrow.progress);
                    render.infoText(ctx);
                    staticCHs.forEach(function (ch, i) {
                        ch.active = sparrow.sparrowIsOver(ch);
                        ch.draw(ctx);
                        ch.red = false;
                    });
                    sparrow.sparrowDraw(ctx);
                    if (!sparrow.hit) {
                        sparrow.progress = timeElapsed / timeGiven;
                    } else {
                        sparrow.fallHeight += sparrow.fallVel;
                        sparrow.fallVel += 0.7;
                        sparrow.fallFwdX += 2;
                        if (sparrow.fallHeight > sandStartY + 10) {
                            youWin();
                        }
                    }
                    
                    if (sparrow.progress > 1.1) {
                        youLose(randMsg());
                        return;
                    }
                };
                var startPlaying = function () {
                    startTime = Date.now();
                    intervalId = setInterval(execFrame, 1000 / fps);
                    jQuery("canvas").on("tap.shotgunGame mousedown.shotgunGame", function () {
                        staticCHs.forEach(function (ch) {
                            if (ch.active) {
                                ch.red = true; // TODO: EITHER GET THIS TO WORK, OR REMOVE IT
                            }
                        });
                    });
                    jQuery("canvas").on("touchstart.shotgunGame mousedown.shotgunGame", function (event) {
                        staticCHs.forEach(function (ch) {
                            if (!sparrow.hit && sparrow.sparrowIsOver(ch)) {
                                sparrow.hit = true;
                                sparrow.fallVel = 5;
                                sparrow.fallHeight = sparrow.y();
                                sparrow.fallFwdX = sparrow.x();
                            }
                        });
                    });
                };
                if (firstTimePlaying) {
                    firstTimePlaying = false;
                    genericRender.clear(ctx);
                    execFrame(); // Do it once, to render the initial image
                    infoOverlay(infoOverlayMsg, startPlaying);
                } else {
                    startPlaying();
                }
            };
        }());
        return {render: render, play: play, gameId: "shotgunGame"};
    }());
    var streetcarGame = (function () {
        var defaultTimeGiven = 8000;
        var peopleToHandle = 8;
        var mkPerson = (function () {
            var proto = {
                draw: function (ctx) {
                    people.render.torso(ctx, this);
                    people.render.face(ctx, this);
                },
                setX: function (newx) {
                    var dx = newx - this.head.x;
                    this.head.x = newx;
                    this.torso.x += dx;
                },
                setY: function (newy) {
                    var dy = newy - this.head.y;
                    this.head.y = newy;
                    this.torso.y += dy;
                }
            };
            var headProto = {
                coversPoint: function (x, y) {
                    return dist(x, y, this.x, this.y) < this.faceWidth / 2; // TODO: THIS IS APPROXIMATE
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
        var mkRandPerson = function (faceX, faceY) {
            var faceDims;
            var guy = {
                head: {
                    x: faceX,
                    y: faceY,
                    // mouthStyle: ...
                    // faceWidth: ... (These are added)
                    // faceHeightFactor: ...
                },
                torso: {
                    x: faceX
                    // y
                },
                skinClr: randSkinTone(),
                eyesClr: "hsl(" + Math.floor(Math.random() * 360) + ", 70%, 70%)",
                eyesHeightFactor: Math.random() * 0.5 + 0.75,
                role: randElem(roles)
            };
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
            guy.head.faceWidth = (Math.round(Math.random() * 5) + 48) * 3; // BE BIGGER FOR THIS
            guy.head.faceHeightFactor = faceDims.heightFactor;
            guy.torso.y = faceY + guy.head.faceHeightFactor * guy.head.faceWidth * 0.25
            return mkPerson(guy);
        };
        var row = function (y, height, color, style) {
            style = style || "fill";
            ctx[style + "Style"] = color;
            ctx[style + "Rect"](0, y, canvasWidth, height);
        };
        var bsHeight = canvasHeight * 0.4; // Height of bottom of buildings in rendering
        var render = {
            behemothBlack: "#111",
            bush: function (ctx, x) {
                ctx.fillStyle = "darkgreen";
                ctx.beginPath();
                shapes.semicircle(ctx, x, bsHeight + 50, 60);
                ctx.fill();
                ctx.strokeStyle = "#030";
                ctx.beginPath();
                ctx.moveTo(x - 60, bsHeight + 50);
                ctx.arc(x, bsHeight + 50, 60, 0, Math.PI, true);
                ctx.stroke();
            },
            buildingsBg: function (ctx) { // Only needs to paint the areas not covered by render.streetcar
                row(0, bsHeight, "#942F37");
                row(bsHeight, 10, "#333");
                row(bsHeight + 10, 5, "#111");
                row(bsHeight + 15, 170, "#888"); // Sidewalk
                row(bsHeight + 185, 20, "#555"); // Curb
                row(bsHeight + 205, 500, "#013"); // Street
                // Bushes:
                render.bush(ctx, canvasWidth * 0.65);
                render.bush(ctx, canvasWidth * 0.4);
                render.bush(ctx, canvasWidth * 0.9);
            },
            streetcar: (function () {
                var scShape = function (ctx) {
                    var radius = 25;
                    var x = canvasWidth * 0.3;
                    var y = canvasHeight * 0.15;
                    var width = canvasWidth * 0.6;
                    var height = canvasHeight * 0.9;
                    ctx.beginPath();
                    ctx.moveTo(x + width, y + height);
                    ctx.lineTo(x + width, y + radius);
                    ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
                    ctx.lineTo(x + radius, y);
                    ctx.quadraticCurveTo(x, y, x, y + radius);
                    ctx.lineTo(x, y + height);
                    ctx.lineTo(0, canvasHeight);
                    ctx.lineTo(0, 0);
                    ctx.lineTo(canvasWidth, 0);
                    ctx.lineTo(canvasWidth, canvasHeight);
                };
                return function (ctx) {
                    scShape(ctx);
                    ctx.fillStyle = "#604";
                    ctx.fill();
                    scShape(ctx);
                    ctx.strokeStyle = "#402";
                    ctx.stroke();
                };
            }()),
            triangle: function (ctx, pt0, pt1, pt2, color) {
                ctx.beginPath();
                ctx.moveTo(pt0.x, pt0.y);
                ctx.lineTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.fillStyle = color;
                ctx.fill();
            },
            behemoth: function (ctx, beh) {
                people.render.torso(ctx, beh);
                people.render.face(ctx, beh);
                var x = beh.head.x, y = beh.head.y, wRad = beh.head.faceWidth / 2;
                render.triangle(ctx, Pt(x - wRad * 0.7 - 15, y - wRad + 40),
                                     Pt(x - wRad * 0.7 + 20, y - wRad + 16),
                                     Pt(x - wRad * 0.7 - 24, y - wRad),
                                     render.behemothBlack);
                render.triangle(ctx, Pt(x + wRad * 0.7 + 15, y - wRad + 40),
                                     Pt(x + wRad * 0.7 - 20, y - wRad + 16),
                                     Pt(x + wRad * 0.7 + 24, y - wRad),
                                     render.behemothBlack);
            },
            infoText: function (ctx) {
                genericRender.infoTexter(ctx, " Admit Muscovites, Reject Behemoth! ", canvasWidth);
            },
            pplLeft: function (ctx, num, serious) {
                ctx.font = "80px arial";
                ctx.fontWeight = "bold";
                ctx.lineWidth = 8;
                if (serious) {
                    ctx.strokeStyle = "red";
                } else {
                    ctx.strokeStyle = "navy";
                }
                ctx.strokeText("" + num, 80, 200);
            }
        };
        var mkBehemoth = function (x, y) {
            var faceWidth = (Math.round(Math.random() * 5) + 50) * 3;
            var black = render.behemothBlack;
            var asperson = mkPerson({
                head: {
                    x: x, y: y,
                    mouthStyle: "behemoth",
                    faceWidth: faceWidth,
                    faceHeightFactor: 1.4
                },
                torso: {
                    x: x, y: y + faceWidth * 0.4
                },
                skinClr: black,
                clothesClr: black,
                skinClr: black,
                eyesClr: "orange",
                eyesHeightFactor: 0.7,
                role: "behemoth"
            });
            asperson.draw = function (ctx) {
                render.behemoth(ctx, this);
            };
            return asperson;
        };
        var infoOverlayMsg =
            [/*"Behemoth is known for his shananigans,",
             "but you're the best streetcar conductor",
             "in Moscow, and you're not going to be",
             "fooled",*/
             "You're the best streetcar conductor in",
             "Moscow. Admit all the Muscovites, and",
             "reject that wretched cat!",
             "",
             "Swipe Down",
             "to bring a customer into the streetcar",
             "",
             "Swipe Up",
             "to kick a Behemoth out",
             "",
             "You have 8 seconds to get",
             "through 8 customers!",
             "",
             "And remember! Don't mess up..."
             ].join("\n");
        var firstTimePlaying = true;
        var play = (function () {
            var floatingX = canvasWidth * 0.3 + canvasWidth * 0.3;
            var enteringStartY = canvasHeight + 50;
            var enteringEndY = canvasHeight * 0.3;
            var exitingInStartY = enteringEndY;
            var exitingInStartX = floatingX;
            var newEnteringPerson = function (chanceOptions) {
                // pplLeft is the people that still need to be handled, including the one being created
                var chars;
                var chanceOptionUsed = randElem(chanceOptions);
                chanceOptions.splice(chanceOptions.indexOf(chanceOptionUsed), 1);
                if (Math.random() < 1 / chanceOptionUsed) {
                    chars = mkBehemoth(floatingX, enteringStartY);
                } else {
                    chars = mkRandPerson(floatingX, enteringStartY);
                }
                return {
                    chars: chars,
                    animation: "entering", // entering | exitingOut | exitingIn -- the 'hovering' stage is just the last moments of the 'entering' stage
                    fracDone: 0
                };
            };
            var kickOutLossMsgs =
                ["You kicked a Muscovite out of\nthe streetcar!",
                 "I ain't no cat!",
                 "How will I get to the pet store now?\n*gasp* I have an idea..."
                 ];
            var letInLossMsgs =
                ["The cat's in the streetcar!\nNo cats! No caaaaats!"];
            var timeLossMsgs = ["You didn't get through the\nline of customers!"];
            return function (handleWin, handleLoss, timeGivenFactor, calledFromHelp) {
                var timeGiven = (timeGivenFactor || 1) * defaultTimeGiven;
                if (calledFromHelp) {
                    firstTimePlaying = true;
                }
                var startTime;
                var intervalId;
                var chanceOptions = [1, 3, 5, 7, 9, 11, 13, 15];
                var gameSt = {
                    peopleHandled: 0,
                    curPerson: newEnteringPerson(chanceOptions)
                };
                var cleanUp = function () {
                    clearInterval(intervalId);
                    jQuery("canvas").off(".streetcarGame");
                    handleTouchend = undefined;
                };
                var youLose = function (msg) {
                    cleanUp();
                    handleLoss(execFrame, gameSt, msg);
                };
                var youWin = function () {
                    var timeElapsed = Date.now() - startTime;
                    var fracTimeLeft = (timeGiven - timeElapsed) / timeGiven;
                    var score01 = fracTimeLeft * 2 / square(timeGivenFactor);
                    cleanUp();
                    handleWin(execFrame, gameSt, score01);
                };
                var admitCustomer = function () {
                    gameSt.curPerson.animation = "exitingIn";
                    gameSt.curPerson.fracDone = 0.05;
                    gameSt.peopleHandled += 1;
                };
                var rejectCustomer = function () {
                    gameSt.curPerson.animation = "exitingOut";
                    gameSt.curPerson.fracDone = 0.05;
                    gameSt.peopleHandled += 1;
                };
                var execFrame = function () {
                    var now = Date.now();
                    var timeElapsed = now - (startTime || now);
                    var curP = gameSt.curPerson;
                    render.buildingsBg(ctx);
                    if (curP.animation !== "exitingOut") {
                        render.streetcar(ctx);
                        render.infoText(ctx);
                    }
                    var fracTimeLeft = 1 - timeElapsed / timeGiven;
                    genericRender.timeLeftBar(ctx, fracTimeLeft);
                    if (curP.animation === "entering") {
                        curP.chars.setY(curP.fracDone * (enteringEndY - enteringStartY) + enteringStartY);
                        curP.fracDone = 1 - (1 - curP.fracDone) * 0.9; // Reduce dist to target by 10 percent each time
                    } else if (curP.animation === "exitingOut") {
                        (function () {
                            // Follow a y = 1/x curve
                            // This math is a mess, but i tweaked and tweaked it based on the equation and
                            // loose intuitiony math in my head and it works aiight so aiight.
                            var newX = exitingInStartX + (canvasWidth * 1.2 - exitingInStartX) * curP.fracDone;
                            var newY = exitingInStartY / ((newX - exitingInStartX) / canvasWidth * 8 + 1);
                            curP.chars.setX(newX);
                            curP.chars.setY(newY);
                            curP.fracDone *= 1.3;
                        }());
                    } else if (curP.animation === "exitingIn") {
                        (function () {
                            // Follow a y = 1/x curve
                            // This math is a mess, but i tweaked and tweaked it based on the equation and
                            // loose intuitiony math in my head and it works aiight so aiight.
                            var newX = exitingInStartX + (canvasWidth * 1.2 - exitingInStartX) * curP.fracDone;
                            var newY = 2 * exitingInStartY - exitingInStartY / ((newX - exitingInStartX) / canvasWidth * 8 + 1);
                            curP.chars.setX(newX);
                            curP.chars.setY(newY);
                            curP.fracDone *= 1.3;
                        }());
                    }
                    curP.chars.draw(ctx);
                    if (curP.animation === "exitingOut") {
                        render.streetcar(ctx);
                        render.infoText(ctx);
                    }
                    render.pplLeft(ctx, peopleToHandle - gameSt.peopleHandled, fracTimeLeft < 0.3);
                    if ((curP.animation === "exitingIn" || curP.animation === "exitingOut") && curP.fracDone > 0.95) {
                        if (curP.animation === "exitingOut" && curP.chars.role !== "behemoth") {
                            return youLose(randElem(kickOutLossMsgs));
                        }
                        if (curP.animation === "exitingIn" && curP.chars.role === "behemoth") {
                            return youLose(randElem(letInLossMsgs));
                        }
                        gameSt.curPerson = newEnteringPerson(chanceOptions);
                    }
                    if (gameSt.peopleHandled >= peopleToHandle) {
                        youWin();
                    }
                    if (timeElapsed > timeGiven) {
                        youLose(randElem(timeLossMsgs));
                    }
                };
                var startPlaying = function () {
                    startTime = Date.now();
                    intervalId = setInterval(execFrame, 1000 / fps);
                    handleTouchend = function (curTouch) {
                        if (curTouch.t0 < startTime) { return; }
                        if (curTouch.y1 > curTouch.y0 + 30) { // Move down >30 pixels?
                            if (gameSt.curPerson.animation === "entering") {
                                admitCustomer();
                            }
                        } else if (curTouch.y1 < curTouch.y0 - 30) { // Move up >30 pixels?
                            if (gameSt.curPerson.animation === "entering") {
                                rejectCustomer();
                            }
                        }
                    };
                };
                if (firstTimePlaying) {
                    firstTimePlaying = false;
                    genericRender.clear(ctx);
                    execFrame(); // Do it once, to render the initial image
                    infoOverlay(infoOverlayMsg, startPlaying);
                } else {
                    startPlaying();
                }
            };
        }());
        return {render: render, play: play, gameId: "streetcarGame"};
    }());
    var minigames = (function () {
        var games = [headsGame, shotgunGame, streetcarGame];
        var launch = function () {
            var gamesCompleted = [];
            var score = 0;
            var timeGivenFactor = 1;
            var lastGame, lastlastGame, newminigame = {};
            return (function anotherGame() { // Perhaps take an argument of a game or two to NOT play, as they were recently played
                lastlastGame = lastGame;
                lastGame = newminigame.gameId;
                do {
                    newminigame = randElem(games);
                } while (newminigame.gameId === lastGame && lastGame === lastlastGame);
                var handleWin = function (executeFrame, gameSt, score01) {
                    gamesCompleted.push(newminigame.gameId);
                    timeGivenFactor = 0.6 + (timeGivenFactor - 0.6) * 0.95;
                    console.log(timeGivenFactor);
                    score += score01 * 1333 + Math.random() * 100 - 50;
                    return anotherGame();
                };
                var handleLoss = function (executeFrame, gameSt, msg) {
                    youLoseScreen.run(msg, score);
                };
                return newminigame.play(handleWin, handleLoss, timeGivenFactor);
            }());
        };
        return {
            games: games,
            launch: launch
        };
    }());
    mainMenu.run();
}());