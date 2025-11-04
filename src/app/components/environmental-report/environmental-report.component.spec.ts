import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvironmentalReportComponent } from './environmental-report.component';

describe('EnvironmentalReportComponent', () => {
  let component: EnvironmentalReportComponent;
  let fixture: ComponentFixture<EnvironmentalReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentalReportComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EnvironmentalReportComponent);
    component = fixture.componentInstance;

    // Mock data for testing
    component.reportData = {
      month: 'Octubre 2024',
      farmName: 'Finca El Bosque',
      monitorName: 'Juan Pérez',
      days: [],
      summary: {
        totalRainfall: 237,
        rainyDays: 15,
        temperature: {
          max: 35,
          min: 21,
          avg: 27.5,
        },
        humidity: {
          max: 78,
          min: 31,
          avg: 54.5,
        },
      },
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display report data correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.report-title')?.textContent).toContain('Reporte de Datos Ambientales - App UVA');
  });

  it('should format rainfall correctly', () => {
    expect(component.formatRainfall(0)).toBe('-');
    expect(component.formatRainfall(5.5)).toBe('5.5');
  });

  it('should format values to one decimal place', () => {
    expect(component.formatValue(25.678)).toBe('25.7');
    expect(component.formatValue(30)).toBe('30.0');
  });
});