package moodify.core

import com.wrapper.spotify.model_objects.specification.ArtistSimplified
import moodify.Config._
import moodify.enumeration.{ItemType, TimeRange}
import moodify.helper.Converter
import moodify.model._
import moodify.repository.{ArtistRepository, TrackRepository}
import moodify.service.{RedisService, SpotifyService}

import scala.reflect.internal.util.Collections.distinctBy

/**
  * Processes user's Spotify data and retrieves insights about user's behaviour.
  *
  * @param spotify Authenticated Spotify service.
  * @param userId  Spotify User ID.
  */
class Insight(spotify: SpotifyService, userId: String) {

  /**
    * Time to live for user's trendline data in Redis.
    */
  private val userTrendlineTTL = 5 * 60 // 5 minutes.

  /**
    * Time to live for user's top tracks and artists in Redis.
    */
  private val userTopListTTL = 1 * 3600 // 1 hour.

  /**
    * Redis key for trendline for given user.
    *
    * @param userId    Spotify User ID.
    * @param numTracks Number of tracks for trendline.
    * @return Redis key.
    */
  private def trendlineRedisKey(userId: String, numTracks: Int) = s"user:$userId:trendline:$numTracks"

  /**
    * Redis key for top tracks of given user in given time range.
    *
    * @param userId    Spotify User ID.
    * @param timeRange Time range for top tracks.
    * @return Redis key.
    */
  private def topTracksRedisKey(userId: String, timeRange: TimeRange.Value) = s"user:$userId:top:track:$timeRange"

  /**
    * Redis key for top artists of given user in given time range.
    *
    * @param userId    Spotify User ID.
    * @param timeRange Time range for top artists.
    * @return Redis key.
    */
  private def topArtistsRedisKey(userId: String, timeRange: TimeRange.Value) = s"user:$userId:top:artist:$timeRange"

  /**
    * Get top artists of current user.
    *
    * @param timeRange Time range for operation.
    * @param limit     Number of artists.
    * @return Top artists.
    */
  def getTopArtists(timeRange: TimeRange.Value, limit: Int): List[SimpleArtist] = {
    val redisKey = topArtistsRedisKey(userId, timeRange)

    // Get user's top artist id list from Redis. If size is enough get artist data and return.
    val maybeTopArtistIdList = RedisService.lrange(redisKey, size = limit)
    if (maybeTopArtistIdList.isDefined) {
      val topArtistIdList = maybeTopArtistIdList.get
        .map(maybeArtistId => maybeArtistId.getOrElse(""))
        .filter(artistId => artistId.nonEmpty)

      if (topArtistIdList.length == limit) {
        val simpleArtistList = topArtistIdList.map(artistId => ArtistRepository.getSimpleArtist(artistId))
        return simpleArtistList
      }
    }

    // Redis does not hold required data. Get top artists from Spotify.
    val topArtists = spotify.getTopArtists(timeRange, limit).toList
    val topSimpleArtists = topArtists.map(artist => Converter.artistToSimpleArtist(artist))
    topSimpleArtists.foreach(simpleArtist => ArtistRepository.setSimpleArtist(simpleArtist))

    val topArtistsIdList = topArtists.map(artist => artist.getId)
    RedisService.rpush(redisKey, topArtistsIdList, userTopListTTL)

    topSimpleArtists
  }

  /**
    * Get top tracks of current user.
    *
    * @param timeRange Time range for operation.
    * @param limit     Number of tracks.
    * @return Top tracks.
    */
  def getTopTracks(timeRange: TimeRange.Value, limit: Int): List[SimpleTrack] = {
    val redisKey = topTracksRedisKey(userId, timeRange)

    // Get user's top track id list from Redis. If size is enough get track data and return.
    val maybeTopTrackIdList = RedisService.lrange(redisKey, size = limit)
    if (maybeTopTrackIdList.isDefined) {
      val topTrackIdList = maybeTopTrackIdList.get
        .map(maybeTrackId => maybeTrackId.getOrElse(""))
        .filter(trackId => trackId.nonEmpty)

      if (topTrackIdList.length == limit) {
        val simpleTrackList = topTrackIdList.map(trackId => TrackRepository.getSimpleTrack(trackId))
        return simpleTrackList
      }
    }

    // Redis does not hold required data. Get top tracks from Spotify.
    val topTracks = spotify.getTopTracks(timeRange, limit).toList
    val topSimpleTracks = topTracks.map(track => Converter.trackToSimpleTrack(track))
    topSimpleTracks.foreach(simpleTrack => TrackRepository.setSimpleTrack(simpleTrack))

    val topTracksIdList = topTracks.map(track => track.getId)
    RedisService.rpush(redisKey, topTracksIdList, userTopListTTL)

    topSimpleTracks
  }

  /**
    * Creates trendline for authenticated user using last played `numTracks` many tracks.
    *
    * @param numTracks Recently played track count to be used.
    * @return User's Trendline.
    */
  def getTrendline(numTracks: Int): Trendline = {
    val redisKey = trendlineRedisKey(userId, numTracks)

    // Get specified trendline from Redis.
    val maybeTrendline = RedisService.hgetall(redisKey)
    if (maybeTrendline.isDefined) {
      val trendline = Converter.mapToTrendline(maybeTrendline.get)
      return trendline
    }

    // Redis does not hold required data. Generate user's trendline.
    val recentTracks = spotify.getRecentTracks(numTracks)
    val recentTracksIdList = recentTracks.map(track => track.getTrack.getId).toList
    val trackFeatureList = TrackRepository.getAudioFeatures(recentTracksIdList)

    val trendlineList = trackFeatureList.map(track => track.trendline)
    val zeroTrendline = Trendline()

    // Take the average of tracks' trendline.
    val avgTrendline = trendlineList.fold(zeroTrendline) { (accum, trendline) =>
      Trendline(
        accum.acousticness + trendline.acousticness / numTracks,
        accum.instrumentalness + trendline.instrumentalness / numTracks,
        accum.speechiness + trendline.speechiness / numTracks,
        accum.danceability + trendline.danceability / numTracks,
        accum.liveness + trendline.liveness / numTracks,
        accum.energy + trendline.energy / numTracks,
        accum.valence + trendline.valence / numTracks
      )
    }

    // Save calculated trendline to Redis.
    RedisService.hmset(redisKey, Converter.trendlineToMap(avgTrendline), userTrendlineTTL)

    avgTrendline
  }

  /**
    * Get default artist set for current user's recommendations.
    *
    * @return List of artists.
    */
  def getRecommendationArtists: List[SearchResponse] = {
    val trackCount = math.min(SPOTIFY_REQUEST_TRACK_LIMIT, RECOMMENDATION_DEFAULT_ARTISTS_LIMIT * 3)
    val recentTracks = spotify.getRecentTracks(trackCount)
    val recentArtists = recentTracks.map(track => track.getTrack.getArtists.head).toList
    val distinctArtists = distinctBy(recentArtists) { artist: ArtistSimplified => artist.getId }
      .take(RECOMMENDATION_DEFAULT_ARTISTS_LIMIT)

    val recommendationArtists = distinctArtists.map { artist =>
      SearchResponse(
        artist.getName,
        artist.getId,
        ItemType.ARTIST
      )
    }

    recommendationArtists
  }

}