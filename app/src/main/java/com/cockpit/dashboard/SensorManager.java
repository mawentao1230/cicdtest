package com.cockpit.dashboard;

public class SensorManager {
    private float speedKmh;
    private float engineRpm;
    private float coolantTempC;
    private int fuelLevelPct;

    public SensorManager() {
        this.speedKmh = 0.0f;
        this.engineRpm = 0.0f;
        this.coolantTempC = 90.0f;
        this.fuelLevelPct = 100;
    }

    public void updateSpeed(float speed) {
        this.speedKmh = Math.max(0.0f, Math.min(300.0f, speed));
    }

    public void updateRpm(float rpm) {
        this.engineRpm = Math.max(0.0f, Math.min(10000.0f, rpm));
    }

    public void updateCoolantTemp(float temp) {
        this.coolantTempC = Math.max(-40.0f, Math.min(150.0f, temp));
    }

    public void updateFuelLevel(int pct) {
        this.fuelLevelPct = Math.max(0, Math.min(100, pct));
    }

    public float getSpeedKmh() {
        return speedKmh;
    }

    public float getEngineRpm() {
        return engineRpm;
    }

    public float getCoolantTempC() {
        return coolantTempC;
    }

    public int getFuelLevelPct() {
        return fuelLevelPct;
    }

    public float getEngineLoad() {
        return (engineRpm / 10000.0f) * 100.0f;
    }

    public String getWarning() {
        if (coolantTempC > 110.0f) return "Engine Overheating!";
        if (fuelLevelPct < 10) return "Low Fuel!";
        if (coolantTempC > 100.0f && fuelLevelPct < 20) return "Check Engine!";
        return "OK";
    }

    public boolean isValid() {
        return speedKmh >= 0.0f
            && engineRpm >= 0.0f
            && coolantTempC >= -40.0f
            && fuelLevelPct <= 100;
    }
}
