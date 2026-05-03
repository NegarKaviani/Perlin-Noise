import React, { useRef, useEffect, useState } from "react";
import Sketch from "react-p5";
import "./OrganicBlob.css";

const AudioCircle = () => {
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const audioContextRef = useRef(null);

  const [audioStarted, setAudioStarted] = useState(false);
  const t = useRef(0);
  const prevVol = useRef(0);
  const strokeColorRef = useRef({ r: 255, g: 255, b: 255 });
  const sparklesRef = useRef([]);

  useEffect(() => {
    return () => {
      // stop audio context when component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 🎤 start microphone (Web Audio API)
  const startAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;

    source.connect(analyser);

    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = audioContext;
    setAudioStarted(true);
  };

  const stopAudio = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    dataArrayRef.current = null;
    setAudioStarted(false);
  };

  // 📊 volume (voice strength)
  const getVolume = () => {
    if (!analyserRef.current) return 0;

    const data = dataArrayRef.current;

    analyserRef.current.getByteTimeDomainData(data);

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      let v = (data[i] - 128) / 128;
      sum += Math.abs(v);
    }

    return sum / data.length;
  };

  const setup = (p5, parent) => {
    parent.innerHTML = "";
    p5.createCanvas(600, 600).parent(parent);
    p5.noFill();
  };

  const draw = (p5) => {
    p5.background(0);
    p5.translate(p5.width / 2, p5.height / 2);

    let volume = getVolume();
    let smoothVol = p5.lerp(prevVol.current, volume, 0.1);
    let volumeChange = volume - prevVol.current;

    if (Math.abs(volumeChange) > 0.02) {
      strokeColorRef.current = {
        r: p5.random(140, 255),
        g: p5.random(140, 255),
        b: p5.random(140, 255),
      };
    }

    const { r, g, b } = strokeColorRef.current;
    p5.stroke(r, g, b);
    p5.strokeWeight(2);
    p5.noFill();

    prevVol.current = smoothVol;

    let baseRadius = 100;
    const blobPoints = [];

    p5.beginShape();

    for (let a = 0; a < p5.TWO_PI; a += 0.05) {
      let xoff = p5.cos(a) + 1;
      let yoff = p5.sin(a) + 1;

      let wave =
        p5.noise(xoff, yoff, t.current) *
        (20 + smoothVol * 120);

      let r = baseRadius + wave;

      let x = r * p5.cos(a);
      let y = r * p5.sin(a);

      blobPoints.push({ x, y, r });
      p5.vertex(x, y);
    }

    p5.endShape(p5.CLOSE);

    // initialize sparkles once
    if (sparklesRef.current.length === 0) {
      for (let i = 0; i < 480; i++) {
        const angle = (i / 480) * p5.TWO_PI + p5.random(-0.05, 0.05);
        const radiusDist = p5.pow(p5.random(), 1.5) * 120;
        
        sparklesRef.current.push({
          angle: angle,
          radiusDist: radiusDist,
          baseRadiusDist: radiusDist,
          offset: p5.random(1000),
          noiseSpeed: p5.random(0.002, 0.01),
          waveFactor: p5.random(0.1, 0.3),
          phase: p5.random(1000),
        });
      }
    }

    p5.strokeWeight(2);
    sparklesRef.current.forEach((sparkle) => {
      const noiseMagnitude = p5.noise(sparkle.offset, t.current * sparkle.noiseSpeed) - 0.5;
      const xoff = p5.cos(sparkle.angle) + 1;
      const yoff = p5.sin(sparkle.angle) + 1;
      
      const blobWave = p5.noise(xoff, yoff, t.current) * (20 + smoothVol * 420);
      const targetRadiusDist = sparkle.baseRadiusDist + noiseMagnitude * 5 + blobWave * 0.15;
      
      sparkle.radiusDist = p5.lerp(sparkle.radiusDist, targetRadiusDist, 0.05);
      sparkle.radiusDist = p5.constrain(sparkle.radiusDist, 5, 150);

      const sparkleRadius = baseRadius + 25 + sparkle.radiusDist;
      const sx = sparkleRadius * p5.cos(sparkle.angle);
      const sy = sparkleRadius * p5.sin(sparkle.angle);
      
      const alpha = p5.map(sparkle.radiusDist, 0, 150, 255, 0, true);
      const size = p5.map(sparkle.radiusDist, 0, 150, 2.8, 0.2, true);

      p5.stroke(r, g, b, alpha);
      p5.strokeWeight(size);
      p5.point(sx, sy);
    });

    t.current += 0.005 + smoothVol * 0.06;
  };

  return (
    <div className="blob-wrapper">
      <div>
        <button onClick={audioStarted ? stopAudio : startAudio} className="mic-btn">
          {
            audioStarted ? "Silence the Spark" : "Ignite the Vibe"
          }
        </button>
      </div>
      <Sketch setup={setup} draw={draw} />
    </div>
  );
};

export default AudioCircle;