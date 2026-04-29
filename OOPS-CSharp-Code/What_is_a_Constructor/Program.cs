
namespace What_is_a_Constructor
{
    class Program
    {

        public class Employee
        {
            public Employee()
            {
                Console.WriteLine("Constructor called");
            }
        }
        static void Main(string[] args)
        {
            
            Employee emp = new Employee();
            
        }

        //Output: Constructor called
    
    }
}