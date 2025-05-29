using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TimeTravelAgency.Application.Infrastructure;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        
// Controller & Swagger registrieren
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        
        builder.Services.AddDbContext<TimeTravelAgencyContext>(options =>
            options.UseSqlite("Data Source=TimeTravelAgencyTest.db"));

        
        var app = builder.Build();
        
        using (var scope = app.Services.CreateScope())
        {
            using (var db = scope.ServiceProvider.GetRequiredService<TimeTravelAgencyContext>())
            {
                // Datenbank erstellen und migrieren
                db.Initialize(true);
                db.Seed();
            }
        }

// Middleware für Swagger aktivieren (nur in Development sinnvoll, aber hier immer an)
        app.UseSwagger();
        app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "TimeTravelAgency API V1"); });

// Routing und Controller-Endpunkte
        app.MapControllers();


        app.Run();
    }
}