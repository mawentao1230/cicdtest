package com.cockpit.dashboard;

import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;

public class SensorManagerTest {

    private SensorManager manager;

    @Before
    public void setUp() {
        manager = new SensorManager();
    }

    @Test
    public void testInitialValues() {
        assertEquals(0.0f, manager.getSpeedKmh(), 0.01f);
        assertEquals(0.0f, manager.getEngineRpm(), 0.01f);
        assertEquals(90.0f, manager.getCoolantTempC(), 0.01f);
        assertEquals(100, manager.getFuelLevelPct());
        assertEquals("OK", manager.getWarning());
    }

    @Test
    public void testSpeedUpdateAndClamping() {
        manager.updateSpeed(120.5f);
        assertEquals(120.5f, manager.getSpeedKmh(), 0.01f);

        manager.updateSpeed(500.0f);
        assertEquals(300.0f, manager.getSpeedKmh(), 0.01f);

        manager.updateSpeed(-10.0f);
        assertEquals(0.0f, manager.getSpeedKmh(), 0.01f);
    }

    @Test
    public void testRpmUpdateAndClamping() {
        manager.updateRpm(7500.0f);
        assertEquals(7500.0f, manager.getEngineRpm(), 0.01f);

        manager.updateRpm(15000.0f);
        assertEquals(10000.0f, manager.getEngineRpm(), 0.01f);

        manager.updateRpm(-500.0f);
        assertEquals(0.0f, manager.getEngineRpm(), 0.01f);
    }

    @Test
    public void testOverheatWarning() {
        manager.updateCoolantTemp(115.0f);
        assertEquals("Engine Overheating!", manager.getWarning());
    }

    @Test
    public void testLowFuelWarning() {
        manager.updateFuelLevel(5);
        assertEquals("Low Fuel!", manager.getWarning());
    }

    @Test
    public void testCheckEngineWarning() {
        manager.updateCoolantTemp(105.0f);
        manager.updateFuelLevel(15);
        assertEquals("Check Engine!", manager.getWarning());
    }

    @Test
    public void testEngineLoad() {
        manager.updateRpm(5000.0f);
        assertEquals(50.0f, manager.getEngineLoad(), 0.01f);

        manager.updateRpm(0.0f);
        assertEquals(0.0f, manager.getEngineLoad(), 0.01f);
    }

    @Test
    public void testValidation() {
        assertTrue(manager.isValid());

        manager.updateSpeed(200.0f);
        manager.updateFuelLevel(50);
        assertTrue(manager.isValid());

        manager.updateSpeed(0.0f);
        manager.updateRpm(0.0f);
        manager.updateFuelLevel(100);
        assertTrue(manager.isValid());
    }

    @Test
    public void testCoolantTempClamping() {
        manager.updateCoolantTemp(200.0f);
        assertEquals(150.0f, manager.getCoolantTempC(), 0.01f);

        manager.updateCoolantTemp(-100.0f);
        assertEquals(-40.0f, manager.getCoolantTempC(), 0.01f);
    }

    @Test
    public void testFuelLevelClamping() {
        manager.updateFuelLevel(150);
        assertEquals(100, manager.getFuelLevelPct());

        manager.updateFuelLevel(-10);
        assertEquals(0, manager.getFuelLevelPct());
    }
}
