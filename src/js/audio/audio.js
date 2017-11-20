'use strict'

import * as THREE from 'three'
import Config from '../Config'
import Tone from 'tone'
import _ from 'lodash'

export default class Audio {
  constructor (camera) {
    this.camera = camera
    this.notes = {
      55.000: 'A1',
      58.270: 'A#1',
      61.735: 'B1',
      65.406: 'C1',
      69.296: 'C#1',
      73.416: 'D1',
      77.782: 'D#1',
      82.407: 'E1',
      87.307: 'F1',
      92.499: 'F#1',
      97.999: 'G1',
      103.826: 'G#1',
      110.000: 'A2',
      116.541: 'A#2',
      123.471: 'B2',
      130.813: 'C2',
      138.591: 'C#2',
      146.832: 'D2',
      155.563: 'D#2',
      164.814: 'E2',
      174.614: 'F2',
      184.997: 'F#2',
      195.998: 'G2',
      207.652: 'G#2',
      220.000: 'A3',
      233.082: 'A#3',
      246.942: 'B3',
      261.626: 'C3',
      277.183: 'C#3',
      293.665: 'D3',
      311.127: 'D#3',
      329.628: 'E3',
      349.228: 'F3',
      369.994: 'F#3',
      391.995: 'G3',
      415.305: 'G#3',
      440.000: 'A3',
      466.164: 'A#3',
      493.883: 'B3',
      523.251: 'C4'
    }

    this.modes = {
      'ionian': [
        'C',
        'D',
        'E',
        'F',
        'G',
        'A',
        'B',
        'C'
      ],
      'dorian': [
        'C',
        'D',
        'D#',
        'F',
        'G',
        'A',
        'A#',
        'C'
      ],
      'phrygian': [
        'C',
        'C#',
        'D#',
        'F',
        'G',
        'G#',
        'A#',
        'C'
      ],
      'lydian': [
        'C',
        'D',
        'E',
        'F#',
        'G',
        'A',
        'B',
        'C'
      ],
      'mixolydian': [
        'C',
        'D',
        'E',
        'F',
        'G',
        'A',
        'A#',
        'C'
      ],
      'aeolian': [
        'C',
        'D',
        'D#',
        'F',
        'G',
        'G#',
        'A#',
        'C'
      ],
      'locrian': [
        'C',
        'C#',
        'D#',
        'F',
        'F#',
        'G#',
        'A#',
        'C'
      ]
    }
    this.panners = []
    this.audioLoader = new THREE.AudioLoader()
  }

  unloadSound () {
    this.panners.forEach((panner) => {
      panner.dispose()
    })

    this.panners = []
  }

  loadSound () {
    return new Promise((resolve, reject) => {
      let loadCount = 0
      let self = this
      _.forIn(this.notes, (note, key) => {
        this.audioLoader.load(
          // resource URL
          Config.assetPath + 'sounds/kalimba/' + note.replace('#', 'S') + '.mp3',
          // Function when resource is loaded
          function (audioBuffer) {
            loadCount++
            if (loadCount === Object.keys(self.notes).length) {
              console.log('sound loaded')
              resolve()
            }
          }
        )
      })
    })
  }

  setupSound () {
    return new Promise((resolve, reject) => {
      this.bpm = 120

      this.masterVol = new Tone.Volume(0).toMaster()

      this.convolver = new Tone.Convolver(Config.assetPath + 'sounds/IR/r1_ortf.wav')
      this.convolver.set('wet', 1.0)

      this.pingPong = new Tone.PingPongDelay('16n', 0.85)

      Tone.Transport.bpm.value = this.bpm

      Tone.Listener.setPosition(this.camera.position.x, this.camera.position.y, this.camera.position.z)

      document.addEventListener('cameraMove', function () {
        Tone.Listener.setPosition(this.camera.position.x, this.camera.position.y, this.camera.position.z)
      }.bind(this), false)

      let cameraForwardVector = new THREE.Vector3()
      let quaternion = new THREE.Quaternion()
      cameraForwardVector.set(0, 0, -1).applyQuaternion(quaternion)

      Tone.Listener.setOrientation(cameraForwardVector.x, cameraForwardVector.y, cameraForwardVector.z, this.camera.up.x, this.camera.up.y, this.camera.up.z)

      this.loadSound().then(() => {
        Tone.Transport.start()
        resolve()
      })
    })
  }

  generateMerkleSound (positionsArray, blockObjectPosition) {
    let noteTotal = 40
    let noteCount = 0

    positionsArray.forEach((point) => {
      noteCount++
      if (noteCount < noteTotal) {
        let pointVector = new THREE.Vector3(point.x, point.y, point.z)
        let offsetPosition = pointVector.add(blockObjectPosition.clone())

        // add positional audio
        let panner = new Tone.Panner3D().chain(this.masterVol)
        panner.refDistance = 500
        panner.rolloffFactor = 50
        panner.setPosition(offsetPosition.x, offsetPosition.y, offsetPosition.z)

        this.panners.push(panner)

        // get closest note
        let minDiff = Number.MAX_SAFE_INTEGER
        let note = 'C1'

        let mode = this.modes.locrian
        for (var frequency in this.notes) {
          if (this.notes.hasOwnProperty(frequency)) {
            let noteName = this.notes[frequency].replace(/[0-9]/g, '')
            if (mode.indexOf(noteName) !== -1) { // filter out notes not in mode
              let diff = Math.abs(point.y - frequency)
              if (diff < minDiff) {
                minDiff = diff
                note = this.notes[frequency]
              }
            }
          }
        }

        let fileName = Config.assetPath + 'sounds/kalimba/' + note.replace('#', 'S') + '.mp3'

        let sampler = new Tone.Sampler({
          [note]: fileName
        }, function () {
          new Tone.Loop((time) => {
            sampler.triggerAttack(note, '@16n', 1.0)
          }, '1m').start(Math.random() * 100)
        })

        sampler.fan(panner)
      }
    })
  }
}
