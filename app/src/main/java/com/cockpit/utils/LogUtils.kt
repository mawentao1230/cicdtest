package com.cockpit.utils

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object LogUtils {
    private val formatter = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)

    fun formatLog(tag: String, message: String): String {
        val timestamp = formatter.format(Date())
        return "[$timestamp] [$tag] $message"
    }

    fun formatSensorReading(name: String, value: Float, unit: String): String {
        return "$name: ${"%.2f".format(value)} $unit"
    }

    fun truncateMessage(message: String, maxLength: Int = 200): String {
        return if (message.length <= maxLength) message
        else message.substring(0, maxLength) + "..."
    }
}
