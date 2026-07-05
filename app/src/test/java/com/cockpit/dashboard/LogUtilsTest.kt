package com.cockpit.dashboard

import com.cockpit.utils.LogUtils
import org.junit.Test
import org.junit.Assert.*

class LogUtilsTest {

    @Test
    fun testFormatLog_containsTagAndMessage() {
        val log = LogUtils.formatLog("TEST", "hello world")
        assertTrue("Should contain tag", log.contains("[TEST]"))
        assertTrue("Should contain message", log.contains("hello world"))
    }

    @Test
    fun testFormatSensorReading_correctFormat() {
        val reading = LogUtils.formatSensorReading("Speed", 120.5f, "km/h")
        assertEquals("Speed: 120.50 km/h", reading)
    }

    @Test
    fun testFormatSensorReading_zeroValue() {
        val reading = LogUtils.formatSensorReading("RPM", 0.0f, "rpm")
        assertEquals("RPM: 0.00 rpm", reading)
    }

    @Test
    fun testTruncateMessage_shorterThanMax() {
        val result = LogUtils.truncateMessage("hello", 10)
        assertEquals("hello", result)
    }

    @Test
    fun testTruncateMessage_exactlyAtMax() {
        val result = LogUtils.truncateMessage("1234567890", 10)
        assertEquals("1234567890", result)
    }

    @Test
    fun testTruncateMessage_longerThanMax() {
        val result = LogUtils.truncateMessage("abcdefghijklmnop", 10)
        assertEquals(13, result.length)
        assertTrue("Should end with '...'", result.endsWith("..."))
    }

    @Test
    fun testTruncateMessage_defaultMaxLength() {
        val longMessage = "a".repeat(250)
        val result = LogUtils.truncateMessage(longMessage)
        assertEquals(203, result.length)
        assertTrue(result.endsWith("..."))
    }
}
