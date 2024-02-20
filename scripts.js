const VideoSDK = window.WebVideoSDK.default

let zmClient = VideoSDK.createClient()
let zmStream
let audioDecode
let audioEncode

// setup your signature endpoint here: https://github.com/zoom/videosdk-sample-signature-node.js
let signatureEndpoint = 'https://or116ttpz8.execute-api.us-west-1.amazonaws.com/default/videosdk'
let sessionName = ''
let sessionPasscode = ''
let userName = 'Participant' + Math.floor(Math.random() * 100)
let role = 1
let userIdentity
let sessionKey
let geoRegions
let cloudRecordingOption
let cloudRecordingElection

let maxVideosPerPage = 9
let maxUsers = 10000
let currentPage = 0

// let videoUsers = [[0,1,2,3,4,5,6,7,8], [9,10,11,12,13,14,15]]

zmClient.init('US-en', 'Global', {
  enforceMultipleVideos: true,
  patchJsMedia: true,
  leaveOnPageUnload: true,
  stayAwake: true
})

function getSignature() {

  document.querySelector('#getSignature').textContent = 'Joining Session...'
  document.querySelector('#getSignature').disabled = true
  document.querySelector('#error').style.display = 'none'

  fetch(signatureEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      sessionName: document.getElementById('sessionName').value || sessionName,
      role: role,
      userIdentity: userIdentity,
      sessionKey: sessionKey,
      geoRegions: geoRegions,
      cloudRecordingOption: cloudRecordingOption,
      cloudRecordingElection: cloudRecordingElection
    })
  }).then((response) => {
    return response.json()
  }).then((data) => {
    joinSession(data.signature)
  }).catch((error) => {
  	console.log(error)
    document.querySelector('#error').style.display = 'block'
    document.querySelector('#error').textContent = 'Something went wrong.'

    document.querySelector('#getSignature').textContent = 'Join Session'
    document.querySelector('#getSignature').disabled = false
  })
}

function joinSession(signature) {
  zmClient.join(document.getElementById('sessionName').value || sessionName, signature, document.getElementById('userName').value || userName, document.getElementById('sessionPasscode').value || sessionPasscode).then((data) => {

    zmStream = zmClient.getMediaStream()

    console.log(zmClient.getSessionInfo())

    document.querySelector('#session').style.display = 'flex'
    document.querySelector('#landing').style.display = 'none'

    // loop through and create 2d array. Then loop through the first page and implement the below logic

    zmClient.getAllUser().forEach((user) => {
      if(user.userId !== zmClient.getCurrentUserInfo().userId) {
        if(user.bVideoOn) {

          let tile = document.createElement('div')
          tile.classList.add("video-tile");
          tile.setAttribute('data-user', user.userId)

          let name = document.createElement('p')
          name.textContent = user.displayName

          tile.appendChild(name);

          zmStream.attachVideo(user.userId, 3).then((data) => {
            console.log(data)
            tile.appendChild(data);

            document.querySelector('video-player-container').appendChild(tile)
          })
        } else {
          let tile = document.createElement('div')
          tile.classList.add("video-tile");
          tile.setAttribute('data-user', user.userId)

          let name = document.createElement('p')
          name.textContent = user.displayName

          tile.appendChild(name);

          let videoOff = document.createElement('div')
          videoOff.classList.add('video-off');

          tile.appendChild(videoOff);

          document.querySelector('video-player-container').appendChild(tile)
        }
      }
    })
    addEventListeners()
  }).catch((error) => {
    console.log(error)
    document.querySelector('#error').style.display = 'block'
    document.querySelector('#error').textContent = error.reason

    document.querySelector('#getSignature').textContent = 'Join Session'
    document.querySelector('#getSignature').disabled = false
  })
}

function startVideo() {
  document.querySelector('#startVideo').textContent = 'Starting Video...'
  document.querySelector('#startVideo').disabled = true

  if(zmStream.isRenderSelfViewWithVideoElement()) {
    zmStream.startVideo({ videoElement: document.querySelector('#self-view-video'), mirrored: true, hd: true }).then(() => {
      document.querySelector('#self-view-video').style.display = 'block'
      document.querySelector('#self-view-name').style.display = 'none'

      document.querySelector('#startVideo').style.display = 'none'
      document.querySelector('#stopVideo').style.display = 'inline-block'

      document.querySelector('#startVideo').textContent = 'Start Video'
      document.querySelector('#startVideo').disabled = false
    }).catch((error) => {
      console.log(error)
    })
  } else {
    zmStream.startVideo({ mirrored: true,  hd: true }).then(() => {
      zmStream.renderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId, 1920, 1080, 0, 0, 3).then(() => {
        document.querySelector('#self-view-canvas').style.display = 'block'
        document.querySelector('#self-view-name').style.display = 'none'

        document.querySelector('#startVideo').style.display = 'none'
        document.querySelector('#stopVideo').style.display = 'inline-block'

        document.querySelector('#startVideo').textContent = 'Start Video'
        document.querySelector('#startVideo').disabled = false
      }).catch((error) => {
        console.log(error)
      })
    }).catch((error) => {
      console.log(error)
    })
  }
}

function stopVideo() {
  zmStream.stopVideo()
  document.querySelector('#self-view-canvas').style.display = 'none'

  document.querySelector('#self-view-video').style.display = 'none'
  document.querySelector('#self-view-name').style.display = 'block'

  document.querySelector('#startVideo').style.display = 'inline-block'
  document.querySelector('#stopVideo').style.display = 'none'
}

function startAudio() {

  var isSafari = window.safari !== undefined

  if(isSafari) {
    console.log('desktop safari')
    if(audioDecode && audioEncode){
      zmStream.startAudio()
      document.querySelector('#startAudio').style.display = 'none'
      document.querySelector('#muteAudio').style.display = 'inline-block'
    } else {
      console.log('desktop safari audio init has not finished')
    }
  } else {
    console.log('not desktop safari')
    zmStream.startAudio()
    document.querySelector('#startAudio').style.display = 'none'
    document.querySelector('#muteAudio').style.display = 'inline-block'
  }
}

function muteAudio() {
  zmStream.muteAudio()

  document.querySelector('#muteAudio').style.display = 'none'
  document.querySelector('#unmuteAudio').style.display = 'inline-block'
}

function unmuteAudio() {
  zmStream.unmuteAudio()

  document.querySelector('#muteAudio').style.display = 'inline-block'
  document.querySelector('#unmuteAudio').style.display = 'none'
}

function leaveSession() {
  zmStream.stopAudio().then(() => {
    if(zmClient.getCurrentUserInfo().bVideoOn) {
      stopVideo()
  
      // it might be rendering on canvas still
      if(zmStream.isRenderSelfViewWithVideoElement()) {
        // all good
      } else {
        zmStream.stopRenderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId)
      }
    }

    zmClient.getAllUser().forEach((user) => {
      if(user.userId !== zmClient.getCurrentUserInfo().userId) {
        if(user.bVideoOn) {
  
          zmStream.detachVideo(user.userId)
  
          // empty video player container?
        } else {
          // do nothing?
        }
      }
    })

    document.querySelector('video-player-container').replaceChildren()
    // empty video player container?

    zmClient.leave()

    removeEventListeners()

    document.querySelector('#session').style.display = 'none'
    document.querySelector('#muteAudio').style.display = 'none'
    document.querySelector('#unmuteAudio').style.display = 'none'
    document.querySelector('#stopVideo').style.display = 'none'
    document.querySelector('#self-view-video').style.display = 'none'

    document.querySelector('#startVideo').style.display = 'inline-block'
    document.querySelector('#startAudio').style.display = 'inline-block'
    document.querySelector('#self-view-name').style.display = 'block'

    document.querySelector('#getSignature').textContent = 'Join Session'
    document.querySelector('#getSignature').disabled = false
    document.querySelector('#startVideo').textContent = 'Start Video'
    document.querySelector('#startVideo').disabled = false

    document.querySelector('#landing').style.display = 'flex'
  })
}

let connectionChange = ((payload) => {
  console.log(payload)

  if(payload.state === 'Reconnecting') {
    console.log('myself reconnecting')
  } else if(payload.state === 'Fail') {
    console.log('myself disconnected')
    // leaveSession()
  } else if(payload.state === 'Connected') {
    console.log('myself connected')
  }
  // session ended case? Maybe its not implemented
})

let mediaSdkChange = ((payload) => {
  console.log(payload)
  const { action, type, result } = payload
  if (type === 'audio' && result === 'success') {
    if (action === 'encode') {
      audioEncode = true
    } else if (action === 'decode') {
      audioDecode = true
    }
  }
})

let userAdded = ((payload) => {

  // add the new user to the pages users array in the last position. Render if they are within the first or "current" page

  if(payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
    let tile = document.createElement('div')
    tile.classList.add("video-tile");
    tile.setAttribute('data-user', payload[0].userId)

    let name = document.createElement('p')
    name.textContent = payload[0].displayName

    tile.appendChild(name);

    // cant do this since user updated is triggered
    // let videoOff = document.createElement('div')
    // videoOff.classList.add('video-off');

    // tile.appendChild(videoOff);

    document.querySelector('video-player-container').appendChild(tile)
  }
})

// why does this trigger on join
let userUpdated = ((payload) => {

  // show or unshow video if the user is within the "current" page

  console.log('user-updated', payload)

  if(payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
    
    if(payload[0].hasOwnProperty('bVideoOn') && payload[0].bVideoOn === true) {

      console.log('video on')

      let tile = document.querySelectorAll(`[data-user='${payload[0].userId}']`)[0]

      let videoOff = tile.children[1]
      console.log(videoOff)

      tile.removeChild(videoOff)

      zmStream.attachVideo(payload[0].userId, 3).then((data) => {
        console.log(data)
        tile.appendChild(data);
      })

    } else if(payload[0].hasOwnProperty('bVideoOn') && payload[0].bVideoOn === false) {

      console.log('video off')

      let tile = document.querySelectorAll(`[data-user='${payload[0].userId}']`)[0]

      zmStream.detachVideo(payload[0].userId).then((data) => {

        // strange
        if(data) {
          tile.removeChild(data[0])
        }

        let videoOff = document.createElement('div')
        videoOff.classList.add('video-off');
        tile.appendChild(videoOff);
      })
    }
  }
})

let userRemoved = ((payload) => {

  // remove the new user from the pages users array and shift the arrays so there is always 9 in each one. Remove from the dom if they are within the "current" page.
  // if the array is shifted, we will have to adjust the rendering somehow

  // if current page && user on that page was removed, need to rerender the page.

  console.log(payload)

  if(payload[0].bVideoOn) {

    let tile = document.querySelectorAll(`[data-user='${payload[0].userId}']`)[0]

    zmStream.detachVideo(payload[0].userId).then(() => {
      console.log('video detached')
      tile.remove()
      console.log('tile removed')
    })
  } else {
    let tile = document.querySelectorAll(`[data-user='${payload[0].userId}']`)[0]
    tile.remove()
    console.log('tile removed')
  }
})

function addEventListeners() {
  zmClient.on('media-sdk-change', mediaSdkChange)
  zmClient.on('connection-change', connectionChange)
  zmClient.on('user-added', userAdded)
  zmClient.on('user-updated', userUpdated)
  zmClient.on('user-removed', userRemoved)
}

function removeEventListeners() {
  zmClient.off('media-sdk-change', mediaSdkChange)
  zmClient.off('connection-change',connectionChange)
  zmClient.off('user-added', userAdded)
  zmClient.off('user-updated', userUpdated)
  zmClient.off('user-removed', userRemoved)
}

/* support 9 videos via flex box */
/* somehow support pagination or do a cap to limit to 9 */
/* detect mobile browser and limit to 4 videos */

/* check if max videos */
/* check if mobile device */

/* if over, don't render, add to next "page" list */
/* when next page is called, follow what I had with docs */
/* when previous page is called, follow what I had with docs */

/* when user joins, loop through getAllUser and populate array. Then render based on that */

/* when a user leaves remove them from the array */

/* when a new user joins, add them to the array */

/* pages[pages.length-1] */
/* users[users.length-1] */

/* need to keep track of what page the user is in from the dom so I know where to target it? */
