package moodify

import com.typesafe.config.ConfigFactory
import moodify.enumeration.Environment

object Config {

  /**
    * Environment that app is running on.
    */
  private val ENV: String = System.getenv("ENV")
  val ENVIRONMENT: Environment.Type = ENV match {
    case "PROD" => Environment.PRODUCTION
    case "TEST" => Environment.TEST
    case _ => Environment.TEST
  }

  /**
    * Config file location.
    */
  private val configFile = ENVIRONMENT match {
    case Environment.PRODUCTION => "prod.conf"
    case Environment.TEST => "test.conf"
  }

  /**
    * Load config file.
    */
  private val config: com.typesafe.config.Config = ConfigFactory.load(configFile)

  /**
    * Client ID for Spotify API access.
    */
  val SPOTIFY_CLIENT_ID: String = System.getenv("SPOTIFY_CLIENT_ID")

  /**
    * Client Secret for Spotify API access.
    */
  val SPOTIFY_CLIENT_SECRET: String = System.getenv("SPOTIFY_CLIENT_SECRET")

  /**
    * URI that Spotify redirects user after authentication process.
    */
  val SPOTIFY_REDIRECT_URI: String = System.getenv("SPOTIFY_REDIRECT_URI")

  /**
    * Redis host.
    */
  val REDIS_HOST: String = config.getString("REDIS.HOST")

  /**
    * Redis port.
    */
  val REDIS_PORT: Int = config.getInt("REDIS.PORT")

  /**
    * Redis password.
    */
  val REDIS_PASSWORD: String = config.getString("REDIS.PASS")

  /**
    * HTTP interface for Akka.
    */
  val HTTP_INTERFACE: String = config.getString("HTTP.INTERFACE")

  /**
    * HTTP port for Akka.
    */
  val HTTP_PORT: Int = config.getInt("HTTP.PORT")

  /**
    * Limit for top artists and tracks.
    */
  val TOP_ARTIST_TRACK_LIMIT: Int = config.getInt("SPOTIFY.TOP_ARTIST_TRACK_LIMIT")

  /**
    * Limit for search items.
    */
  val SEARCH_ITEM_LIMIT: Int = config.getInt("SPOTIFY.SEARCH_ITEM_LIMIT")

  /**
    * Size of newly created playlist.
    */
  val NEW_PLAYLIST_SIZE: Int = config.getInt("SPOTIFY.NEW_PLAYLIST_SIZE")

  /**
    * Limit for number of artists for default recommendation list.
    */
  val RECOMMENDATION_DEFAULT_ARTISTS_LIMIT: Int = config.getInt("SPOTIFY.RECOMMENDATION_DEFAULT_ARTISTS_LIMIT")

  /**
    * Margin in seconds for Spotify tokens that are being reused, to avoid end up with an invalid token.
    */
  val TOKEN_TTL_MARGIN: Int = config.getInt("SPOTIFY.TOKEN_TTL_MARGIN")

  /**
    * Maximum number of tracks that can be requested from Spotify API.
    */
  val SPOTIFY_REQUEST_TRACK_LIMIT: Int = config.getInt("SPOTIFY.REQUEST_TRACK_LIMIT")

  /**
    * CORS allowed URL address.
    */
  val CORS_ALLOWED_URL: String = config.getString("HTTP.CORS_ALLOWED_URL")

}
