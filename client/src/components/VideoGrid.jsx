import React from 'react';
import VideoTile from './VideoTile';

const PLAYER_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EC4899'];

export default function VideoGrid({
  peers,
  myId,
  localStream,
  remoteStreams,
  isMicOn,
  isCamOn,
  myUsername,
  incomingInvite = null,
  onAcceptInvite = null,
  onDeclineInvite = null,
  outgoingInvite = null,
  onCancelInvite = null
}) {
  // Determine index of local user among peers
  const myIndex = peers.findIndex(p => p.id === myId);
  const myColor = PLAYER_COLORS[myIndex >= 0 ? myIndex % 4 : 0];

  // Grid styling: strictly equal rows on mobile and desktop to prevent any bottom cut-off
  const totalTiles = Math.max(peers.length, 1);
  const gridClass = totalTiles <= 2
    ? 'grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1 gap-2 sm:gap-3'
    : 'grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3';

  return (
    <div className={`w-full h-full min-h-0 p-2 sm:p-3 overflow-hidden ${gridClass}`}>
      {/* Local Video Tile */}
      <VideoTile
        stream={localStream}
        isLocal={true}
        username={myUsername}
        isMicMuted={!isMicOn}
        isCamMuted={!isCamOn}
        color={myColor}
        outgoingChallenge={outgoingInvite}
        onCancelChallenge={onCancelInvite}
      />

      {/* Remote Video Tiles */}
      {peers
        .filter(p => p.id !== myId)
        .map((peer, idx) => {
          const peerIndex = peers.findIndex(p => p.id === peer.id);
          const peerColor = PLAYER_COLORS[peerIndex >= 0 ? peerIndex % 4 : (idx + 1) % 4];
          const stream = remoteStreams[peer.id] || null;
          const isChallenger = incomingInvite && incomingInvite.fromId === peer.id;

          return (
            <VideoTile
              key={peer.id}
              stream={stream}
              isLocal={false}
              username={peer.username}
              color={peerColor}
              incomingChallenge={isChallenger ? incomingInvite : null}
              onAcceptChallenge={isChallenger ? onAcceptInvite : null}
              onDeclineChallenge={isChallenger ? onDeclineInvite : null}
            />
          );
        })}
    </div>
  );
}
