import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function useWebRTC(socket) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // peerId -> MediaStream
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [mediaError, setMediaError] = useState(null);

  const peerConnections = useRef(new Map()); // peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);

  // Initialize Local Media Stream
  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { max: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      return stream;
    } catch (err) {
      console.warn('[WebRTC] Camera/Mic access denied or unavailable:', err);
      setMediaError(err.message || 'Permission denied');
      return null;
    }
  }, []);

  // Cleanup helper
  const closeAllPeerConnections = useCallback(() => {
    peerConnections.current.forEach((pc) => {
      pc.close();
    });
    peerConnections.current.clear();
    setRemoteStreams({});
  }, []);

  const closePeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    }
  }, []);

  // Create or retrieve PeerConnection for a specific remote peer
  const getOrCreatePeerConnection = useCallback((peerId) => {
    if (peerConnections.current.has(peerId)) {
      return peerConnections.current.get(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(peerId, pc);

    // Add local tracks to this connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('signal', {
          targetId: peerId,
          signalData: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Remote track arrived
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${peerId}`);
      const [stream] = event.streams;
      if (stream) {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: stream
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${peerId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeerConnection(peerId);
      }
    };

    return pc;
  }, [socket, closePeerConnection]);

  // Mesh Initiator setup when a room is matched
  const setupMeshConnections = useCallback(async (peers) => {
    if (!socket || !peers) return;

    for (const peer of peers) {
      if (peer.id === socket.id) continue;

      const pc = getOrCreatePeerConnection(peer.id);

      // Deterministic negotiation: socket with higher ID initiates the offer
      if (socket.id > peer.id) {
        try {
          console.log(`[WebRTC] Initiating offer to peer: ${peer.id}`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', {
            targetId: peer.id,
            signalData: { type: 'offer', sdp: offer }
          });
        } catch (err) {
          console.error(`[WebRTC] Error creating offer to ${peer.id}:`, err);
        }
      }
    }
  }, [socket, getOrCreatePeerConnection]);

  // Signaling message handler
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ senderId, signalData }) => {
      const pc = getOrCreatePeerConnection(senderId);

      try {
        if (signalData.type === 'offer') {
          console.log(`[WebRTC] Handling offer from ${senderId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            targetId: senderId,
            signalData: { type: 'answer', sdp: answer }
          });
        } else if (signalData.type === 'answer') {
          console.log(`[WebRTC] Handling answer from ${senderId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        } else if (signalData.type === 'candidate') {
          if (signalData.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          }
        }
      } catch (err) {
        console.error(`[WebRTC] Signaling error with ${senderId}:`, err);
      }
    };

    socket.on('signal', handleSignal);

    return () => {
      socket.off('signal', handleSignal);
    };
  }, [socket, getOrCreatePeerConnection]);

  // Toggle Mute
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  return {
    localStream,
    remoteStreams,
    isMicOn,
    isCamOn,
    mediaError,
    startLocalMedia,
    setupMeshConnections,
    closePeerConnection,
    closeAllPeerConnections,
    toggleMic,
    toggleCam
  };
}
