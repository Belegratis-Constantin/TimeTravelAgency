namespace TimeTravelAgency.Application.Model;

public class CriticalTrip : Trip
{
    // Constructors

    public CriticalTrip(LicensedAgent licensedSupportAgent, DateTime dateInRealLife, LicensedAgent licensedAgent, Manager manager, string? tripName=null,
        int durationMinutes = DefaultDurationMinutes)
        : base(dateInRealLife, licensedAgent, manager, tripName, durationMinutes: durationMinutes)
    {
        LicensedSupportAgent = licensedSupportAgent;
    }
    
#pragma warning disable CS8618
    protected CriticalTrip() { }
#pragma warning restore CS8618
    
    
    // Properties
    
    public virtual LicensedAgent LicensedSupportAgent { get; set; }
    public int LicensedSupportAgentId { get; set; }
}