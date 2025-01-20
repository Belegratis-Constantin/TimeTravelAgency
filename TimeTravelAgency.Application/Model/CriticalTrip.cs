namespace TimeTravelAgency.Application.Model;

public class CriticalTrip : Trip
{
    // Constructors

    public CriticalTrip(LicensedAgent licensedSupportAgent, DateTime dateInRealLife, LicensedAgent licensedAgent, Manager manager, string? tripName=null)
        : base(dateInRealLife, licensedAgent, manager, tripName)
    {
        LicensedSupportAgent = licensedSupportAgent;
    }
    
#pragma warning disable CS8618
    protected CriticalTrip() { }
#pragma warning restore CS8618
    
    
    // Properties
    
    LicensedAgent LicensedSupportAgent { get; set; }
}