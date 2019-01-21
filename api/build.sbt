name := "MoodifyAPI"

version := "0.1"

scalaVersion := "2.12.7"

val akkaVersion     = "2.5.14"
val akkaHttpVersion = "10.1.3"

libraryDependencies ++= Seq(
  "com.typesafe.akka"            %% "akka-actor"                % akkaVersion,
  "com.typesafe.akka"            %% "akka-stream"               % akkaVersion,
  "com.typesafe.akka"            %% "akka-http"                 % akkaHttpVersion,
  "com.typesafe.akka"            %% "akka-http-spray-json"      % akkaHttpVersion,
  "com.typesafe.scala-logging"   %% "scala-logging"             % "3.9.0",
  "net.debasishg"                %% "redisclient"               % "3.8",
  "org.scalatest"                %% "scalatest"                 % "3.0.5" % "test",
  "ch.qos.logback"               %  "logback-classic"           % "1.2.3",
  "se.michaelthelin.spotify"     %  "spotify-web-api-java"      % "2.0.5",
  "com.typesafe"                 %  "config"                    % "1.3.2",
  "org.slf4j"                    %  "slf4j-simple"              % "1.6.2" % Test
)

mainClass in (Compile, packageBin) := Some("moodify.api.Boot")

mainClass in (Compile, run) := Some("moodify.api.Boot")