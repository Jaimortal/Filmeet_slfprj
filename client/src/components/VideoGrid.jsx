import React from 'react';
import VideoTile from './VideoTile';

const PLAYER_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899'];

export default function VideoGrid({ peers, myId, localStream, remoteStreams, isMicOn, isCamOn, myUsername }) {
  // Determine index of local user among peers
  const myIndex = peers.findIndex(p => p.id === myId);
  const myColor = PLAYER_COLORS[myIndex >= 0 ? myIndex % 4 : 0];

  // Grid styling based on number of participants
  const totalTiles = Math.max(peers.length, 1);
  const gridClass = totalTiles <= 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-3 h-full'
    : 'grid grid-cols-2 gap-3 h-full';

  return (
    <div className={`w-full p-2 sm:p-3 overflow-hidden ${gridClass}`}>
      {/* Local Video Tile */}
      <VideoTile
        stream={localStream}
        isLocal={true}
        username={myUsername}
        isMicMuted={!isMicOn}
        isCamMuted={!isCamOn}
        color={myColor}
      />

      {/* Remote Video Tiles */}
      {peers
        .filter(p => p.id !== myId)
        .map((peer, idx) => {
          const peerIndex = peers.findIndex(p => p.id === peer.id);
          const peerColor = PLAYER_COLORS[peerIndex >= 0 ? peerIndex % 4 : (idx + 1) % 4];
          const stream = remoteStreams[peer.id] || null;

          return (
            <VideoTile
              key={peer.id}
              stream={stream}
              isLocal={false}
              username={peer.username}
              color={peerColor}
            />
          );
        })}
    </div>
  );
}
