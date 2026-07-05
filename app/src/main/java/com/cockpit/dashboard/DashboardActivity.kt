package com.cockpit.dashboard

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.cockpit.utils.LogUtils

class DashboardActivity : AppCompatActivity() {
    private lateinit var sensorManager: SensorManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        sensorManager = SensorManager()
        sensorManager.updateSpeed(0f)

        val display = buildDisplayText()
        val textView = TextView(this)
        textView.text = display
        setContentView(textView)

        LogUtils.formatLog("Dashboard", "Activity created")
    }

    private fun buildDisplayText(): String {
        return """
            |=== SMART COCKPIT DASHBOARD ===
            |Speed:  ${LogUtils.formatSensorReading("Speed", sensorManager.speedKmh, "km/h")}
            |RPM:    ${LogUtils.formatSensorReading("RPM", sensorManager.engineRpm, "rpm")}
            |Coolant: ${LogUtils.formatSensorReading("Coolant", sensorManager.coolantTempC, "\u00b0C")}
            |Fuel:   ${sensorManager.fuelLevelPct}%
            |Status: ${sensorManager.warning}
            |Engine Load: ${"%.1f".format(sensorManager.engineLoad)}%
        """.trimMargin()
    }

    companion object {
        init {
            System.loadLibrary("native-lib")
        }
    }
}
